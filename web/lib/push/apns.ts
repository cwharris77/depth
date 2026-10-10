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

/**
 * `unknown` is a request that was written to an open connection and got no status back:
 * APNs may or may not have accepted it. `retry` is a request APNs definitely did not
 * deliver.
 */
export type ApnsOutcome = 'sent' | 'prune' | 'retry' | 'fatal' | 'unknown';

const PRUNE_REASONS = new Set(['BadDeviceToken', 'DeviceTokenNotForTopic']);

/** The 403 reasons that say the provider token itself is bad, for every device alike. */
const PROVIDER_TOKEN_REASONS = new Set([
  'InvalidProviderToken',
  'ExpiredProviderToken',
  'MissingProviderToken',
]);

/**
 * What a response means for the sender: delivered, the token is dead, try again on a
 * later run, or the provider token is wrong and no request in this run can work. Any
 * other 403 is about one device's topic or environment, so only that request fails.
 * Status 0 stands for a request that was never started; one that was written and went
 * unanswered is `unknown`, which the client decides and this never returns.
 */
export function classifyApnsResponse(status: number, reason: string | null): ApnsOutcome {
  if (status === 200) return 'sent';
  if (status === 410) return 'prune';
  if (status === 403) {
    return reason === null || PROVIDER_TOKEN_REASONS.has(reason) ? 'fatal' : 'retry';
  }
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

interface OpenSession {
  session: ClientHttp2Session;
  /** False until the connection is established; nothing is written before that. */
  connected: boolean;
}

export function createHttp2ApnsClient(args: {
  jwt: string;
  now: Date;
  /** Opens the HTTP/2 session for a host. Defaults to `node:http2`'s `connect`. */
  connect?: (url: string) => ClientHttp2Session;
  requestTimeoutMs?: number;
}): ApnsClient {
  const open = args.connect ?? connect;
  const timeoutMs = args.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const sessions = new Map<ApnsEnvironment, OpenSession>();
  const expiration = String(Math.floor(args.now.getTime() / 1000) + EXPIRATION_SECONDS);

  function session(environment: ApnsEnvironment): OpenSession {
    const existing = sessions.get(environment);
    if (existing && !existing.session.closed && !existing.session.destroyed) return existing;
    const created: OpenSession = { session: open(HOSTS[environment]), connected: false };
    created.session.on('connect', () => {
      created.connected = true;
    });
    // A session error is reported by the request that hits it; without a listener it
    // would be an unhandled 'error' event.
    created.session.on('error', () => {});
    sessions.set(environment, created);
    return created;
  }

  return {
    send(request) {
      return new Promise((resolve) => {
        let used: OpenSession;
        let stream: ClientHttp2Stream;
        try {
          used = session(request.environment);
          stream = used.session.request({
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
          // No stream exists, so nothing was written.
          resolve({ outcome: 'retry', status: 0, reason: (error as Error).message });
          return;
        }
        let status = 0;
        let body = '';
        // Runs on the first of the deadline, 'error' and 'close'; a later call's resolve
        // is a no-op.
        const finish = (failure: string | null) => {
          clearTimeout(deadline);
          if (status !== 0) {
            const reason = errorReason(body);
            resolve({ outcome: classifyApnsResponse(status, reason), status, reason });
            return;
          }
          // A request made while the session is still connecting is queued and only
          // written once it connects, so a session that never connected sent nothing.
          // After that the request may have reached APNs, whatever ended the stream.
          resolve({ outcome: used.connected ? 'unknown' : 'retry', status: 0, reason: failure });
        };
        // A stream's own timeout never fires while its session is still connecting, so
        // the deadline is a timer and settles the request itself.
        const deadline = setTimeout(() => {
          if (used.connected) {
            stream.close();
          } else {
            // The connection never opened. Destroying it frees the socket, and dropping
            // it from the cache makes the next request open a fresh one.
            if (sessions.get(request.environment) === used) sessions.delete(request.environment);
            used.session.destroy();
          }
          finish('request timed out');
        }, timeoutMs);
        stream.setEncoding('utf8');
        stream.on('response', (headers) => {
          status = Number(headers[':status'] ?? 0);
        });
        stream.on('data', (chunk: string) => {
          body += chunk;
        });
        stream.on('error', (error: Error) => finish(error.message));
        stream.on('close', () => finish(null));
        stream.end(JSON.stringify(request.payload));
      });
    },
    close() {
      for (const existing of sessions.values()) {
        // A graceful close waits on a connection that may never open.
        if (existing.connected) existing.session.close();
        else existing.session.destroy();
      }
      sessions.clear();
    },
  };
}
