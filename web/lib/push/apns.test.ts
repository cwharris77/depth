// @vitest-environment node
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { classifyApnsResponse, createApnsJwt } from './apns';

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
    [403, 'InvalidProviderToken', 'fatal'],
    [403, 'ExpiredProviderToken', 'fatal'],
    [429, 'TooManyRequests', 'retry'],
    [500, 'InternalServerError', 'retry'],
    [503, 'ServiceUnavailable', 'retry'],
    [0, null, 'retry'],
  ] as const)('%i %s -> %s', (status, reason, expected) => {
    expect(classifyApnsResponse(status, reason)).toBe(expected);
  });
});
