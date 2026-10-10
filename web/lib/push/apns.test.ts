// @vitest-environment node
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import {
  connect,
  createServer,
  type Http2Server,
  type ServerHttp2Session,
  type ServerHttp2Stream,
} from 'node:http2';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import {
  classifyApnsResponse,
  createApnsJwt,
  createHttp2ApnsClient,
  type ApnsClient,
} from './apns';

function decode(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

describe('createApnsJwt', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const keyP8 = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const now = new Date('2026-10-10T12:00:00Z');
  const jwt = createApnsJwt({ keyP8, keyId: 'ABC123DEFG', teamId: '63JZBB528Q', now });
  const [header, claims, signature] = jwt.split('.');

  it('carries the key id, team id and issue time', () => {
    expect(decode(header)).toEqual({ alg: 'ES256', kid: 'ABC123DEFG' });
    expect(decode(claims)).toEqual({ iss: '63JZBB528Q', iat: 1791633600 });
  });

  it('is signed with ES256 in the raw r||s form JWT requires', () => {
    const raw = Buffer.from(signature, 'base64url');
    expect(raw.length).toBe(64);
    const ok = verify(
      'sha256',
      Buffer.from(`${header}.${claims}`),
      {
        key: createPublicKey(publicKey.export({ type: 'spki', format: 'pem' })),
        dsaEncoding: 'ieee-p1363',
      },
      raw
    );
    expect(ok).toBe(true);
  });

  it('accepts a key whose newlines were flattened to \\n by a secret store', () => {
    const flattened = keyP8.replace(/\n/g, '\\n');
    expect(() =>
      createApnsJwt({ keyP8: flattened, keyId: 'ABC123DEFG', teamId: '63JZBB528Q', now })
    ).not.toThrow();
  });
});

describe('classifyApnsResponse', () => {
  it.each([
    [200, null, 'sent'],
    [410, 'Unregistered', 'prune'],
    [410, 'ExpiredToken', 'prune'],
    [400, 'BadDeviceToken', 'prune'],
    [400, 'DeviceTokenNotForTopic', 'prune'],
    [400, 'PayloadTooLarge', 'retry'],
    [400, 'BadCollapseId', 'retry'],
    [400, 'BadTopic', 'retry'],
    [403, 'InvalidProviderToken', 'fatal'],
    [403, 'ExpiredProviderToken', 'fatal'],
    [403, 'MissingProviderToken', 'fatal'],
    [403, null, 'fatal'],
    [403, 'BadEnvironmentKeyInToken', 'retry'],
    [403, 'BadEnvironmentKeyIdInToken', 'retry'],
    [403, 'Forbidden', 'retry'],
    [403, 'TopicDisallowed', 'retry'],
    [429, 'TooManyRequests', 'retry'],
    [500, 'InternalServerError', 'retry'],
    [503, 'ServiceUnavailable', 'retry'],
    [0, null, 'retry'],
  ] as const)('%i %s -> %s', (status, reason, expected) => {
    expect(classifyApnsResponse(status, reason)).toBe(expected);
  });
});

describe('createHttp2ApnsClient', () => {
  let server: Http2Server | undefined;
  let client: ApnsClient | undefined;
  const serverSessions = new Set<ServerHttp2Session>();

  afterEach(async () => {
    client?.close();
    for (const open of serverSessions) open.destroy();
    serverSessions.clear();
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
    client = undefined;
  });

  /** A cleartext HTTP/2 server on a free local port, standing in for APNs. */
  async function listen(onStream: (stream: ServerHttp2Stream) => void): Promise<string> {
    const created = createServer();
    server = created;
    created.on('session', (open) => serverSessions.add(open));
    created.on('stream', (stream) => {
      // Resetting a stream makes the server side emit 'error' as well.
      stream.on('error', () => {});
      onStream(stream);
    });
    await new Promise<void>((resolve) => created.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(created.address() as AddressInfo).port}`;
  }

  function clientFor(url: string, requestTimeoutMs?: number): ApnsClient {
    client = createHttp2ApnsClient({
      jwt: 'jwt',
      now: new Date('2026-10-10T12:00:00Z'),
      connect: () => connect(url),
      requestTimeoutMs,
    });
    return client;
  }

  const request = {
    token: 'a'.repeat(64),
    environment: 'production',
    topic: 'com.cwharris.depth',
    collapseId: 'c'.repeat(64),
    payload: { aps: { alert: { title: 'Hello' } } },
  } as const;

  it('reports a 200 as sent', async () => {
    const url = await listen((stream) => {
      stream.respond({ ':status': 200 });
      stream.end();
    });
    expect(await clientFor(url).send(request)).toEqual({
      outcome: 'sent',
      status: 200,
      reason: null,
    });
  });

  it('classifies an error status by the reason in its body', async () => {
    const url = await listen((stream) => {
      stream.respond({ ':status': 410 });
      stream.end(JSON.stringify({ reason: 'Unregistered' }));
    });
    expect(await clientFor(url).send(request)).toEqual({
      outcome: 'prune',
      status: 410,
      reason: 'Unregistered',
    });
  });

  it('is unknown when the connection drops after the request was written', async () => {
    const url = await listen((stream) => stream.session?.destroy());
    expect(await clientFor(url).send(request)).toMatchObject({ outcome: 'unknown', status: 0 });
  });

  it('is unknown when the stream is reset with no response', async () => {
    const url = await listen((stream) => stream.close(2));
    expect(await clientFor(url).send(request)).toMatchObject({ outcome: 'unknown', status: 0 });
  });

  it('is unknown when no response arrives before the timeout', async () => {
    const url = await listen(() => {});
    expect(await clientFor(url, 50).send(request)).toMatchObject({ outcome: 'unknown', status: 0 });
  });

  it('is a retry when the connection never opened, so nothing was written', async () => {
    const url = await listen(() => {});
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
    expect(await clientFor(url).send(request)).toMatchObject({ outcome: 'retry', status: 0 });
  });

  it('is a retry when the session cannot be created at all', async () => {
    client = createHttp2ApnsClient({
      jwt: 'jwt',
      now: new Date('2026-10-10T12:00:00Z'),
      connect: () => {
        throw new Error('no session');
      },
    });
    expect(await client.send(request)).toEqual({
      outcome: 'retry',
      status: 0,
      reason: 'no session',
    });
  });

  it('keeps a status that arrived before the stream failed', async () => {
    const url = await listen((stream) => {
      stream.respond({ ':status': 200 });
      stream.write('x', () => stream.session?.destroy());
    });
    expect(await clientFor(url).send(request)).toMatchObject({ outcome: 'sent', status: 200 });
  });
});
