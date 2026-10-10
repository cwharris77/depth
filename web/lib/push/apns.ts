// Apple Push Notification service over HTTP/2 with token authentication. The signing
// and the response classification are pure; `createHttp2ApnsClient` is the only I/O.

import { createPrivateKey, sign } from 'node:crypto';
import { connect, type ClientHttp2Session, type ClientHttp2Stream } from 'node:http2';
import type { ApnsEnvironment } from './types';

const HOSTS: Record<ApnsEnvironment, string> = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
};

/** How long APNs keeps trying to deliver to a device that is offline. */
const EXPIRATION_SECONDS = 12 * 60 * 60;
const REQUEST_TIMEOUT_MS = 15_000;

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

/**
 * A provider token. One is valid for an hour and must not be regenerated more than once
 * every 20 minutes, so a run creates one and reuses it for every request.
 */
export function createApnsJwt(args: {
  keyP8: string;
  keyId: string;
  teamId: string;
  now: Date;
}): string {
  // Secret stores commonly flatten a PEM's newlines to the two characters "\n".
  const pem = args.keyP8.includes('\\n') ? args.keyP8.replace(/\\n/g, '\n') : args.keyP8;
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: args.keyId }));
  const claims = base64url(
    JSON.stringify({ iss: args.teamId, iat: Math.floor(args.now.getTime() / 1000) })
  );
  // JWT wants the raw r||s signature, not the DER form node produces by default.
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), {
    key: createPrivateKey(pem),
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${claims}.${base64url(signature)}`;
}

export type ApnsOutcome = 'sent' | 'prune' | 'retry' | 'fatal';

const PRUNE_REASONS = new Set(['BadDeviceToken', 'DeviceTokenNotForTopic']);

/**
 * What a response means for the sender: delivered, the token is dead, try again on a
 * later run, or the provider credentials are wrong and no request in this run can work.
 * Status 0 stands for a request that never got a response.
 */
export function classifyApnsResponse(status: number, reason: string | null): ApnsOutcome {
  if (status === 200) return 'sent';
  if (status === 410) return 'prune';
  if (status === 403) return 'fatal';
  if (status === 400 && reason !== null && PRUNE_REASONS.has(reason)) return 'prune';
  return 'retry';
}

export interface ApnsRequest {
  token: string;
  environment: ApnsEnvironment;
  topic: string;
  collapseId: string;
  payload: unknown;
}

export interface ApnsResponse {
  outcome: ApnsOutcome;
  status: number;
  reason: string | null;
}

export interface ApnsClient {
  send(request: ApnsRequest): Promise<ApnsResponse>;
  close(): void;
}

/** The `reason` of an APNs error body; null for an empty or unreadable one. */
function errorReason(body: string): string | null {
  if (!body) return null;
  try {
    return (JSON.parse(body) as { reason?: string }).reason ?? null;
  } catch {
    return null;
  }
}

export function createHttp2ApnsClient(args: { jwt: string; now: Date }): ApnsClient {
  const sessions = new Map<ApnsEnvironment, ClientHttp2Session>();
  const expiration = String(Math.floor(args.now.getTime() / 1000) + EXPIRATION_SECONDS);

  function session(environment: ApnsEnvironment): ClientHttp2Session {
    const open = sessions.get(environment);
    if (open && !open.closed && !open.destroyed) return open;
    const created = connect(HOSTS[environment]);
    // A session error is reported by the request that hits it; without a listener it
    // would be an unhandled 'error' event.
    created.on('error', () => {});
    sessions.set(environment, created);
    return created;
  }

  return {
    send(request) {
      return new Promise((resolve) => {
        const finish = (status: number, reason: string | null) =>
          resolve({ outcome: classifyApnsResponse(status, reason), status, reason });
        let stream: ClientHttp2Stream;
        try {
          stream = session(request.environment).request({
            ':method': 'POST',
            ':path': `/3/device/${request.token}`,
            authorization: `bearer ${args.jwt}`,
            'apns-topic': request.topic,
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'apns-expiration': expiration,
            'apns-collapse-id': request.collapseId,
            'content-type': 'application/json',
          });
        } catch (error) {
          finish(0, (error as Error).message);
          return;
        }
        let status = 0;
        let body = '';
        stream.setEncoding('utf8');
        stream.setTimeout(REQUEST_TIMEOUT_MS, () => stream.close());
        stream.on('response', (headers) => {
          status = Number(headers[':status'] ?? 0);
        });
        stream.on('data', (chunk: string) => {
          body += chunk;
        });
        stream.on('error', (error: Error) => finish(0, error.message));
        stream.on('close', () => finish(status, errorReason(body)));
        stream.end(JSON.stringify(request.payload));
      });
    },
    close() {
      for (const open of sessions.values()) open.close();
      sessions.clear();
    },
  };
}
