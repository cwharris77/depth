#!/usr/bin/env node
// scripts/ios-release-status.mjs
//
// Read-only report of where an iOS version stands: the version the public App Store listing
// serves, plus (with an App Store Connect API key) the builds uploaded for that version and the
// App Store version's review state. Prints JSON with a derived `stage`:
//
//   live        the public listing serves this version
//   rejected    App Review rejected the version or its binary
//   review      submitted: waiting for review, in review, or approved and releasing
//   testflight  a processed build exists for this version, not yet submitted
//   processing  a build is uploaded and still processing
//   none        nothing uploaded for this version yet
//   unknown     not live, and no API key is configured to look further
//
// Usage: scripts/ios-release-status.mjs <version>        e.g. 1.1
//
// API key: ASC_KEY_ID, ASC_ISSUER_ID and optionally ASC_KEY_PATH, or the same values as
// keyId / issuerId / keyPath in ~/.config/depth/app-store-connect.json. The key file defaults
// to ~/.appstoreconnect/private_keys/AuthKey_<keyId>.p8, where xcodebuild and altool also
// look. No Node dependencies: the ES256 token is signed with node:crypto.

import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.appstoreconnect.apple.com/v1';
const REVIEW_STATES = new Set([
  'READY_FOR_REVIEW',
  'WAITING_FOR_REVIEW',
  'IN_REVIEW',
  'ACCEPTED',
  'PENDING_APPLE_RELEASE',
  'PENDING_DEVELOPER_RELEASE',
  'PROCESSING_FOR_DISTRIBUTION',
  'READY_FOR_DISTRIBUTION',
  'READY_FOR_SALE',
]);
const REJECTED_STATES = new Set(['REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);

const version = process.argv[2];
if (!version || !/^\d+\.\d+(\.\d+)?$/.test(version)) {
  console.error('Usage: scripts/ios-release-status.mjs <version>   e.g. 1.1');
  process.exit(2);
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundleId = /^APP_BUNDLE_IDENTIFIER\s*=\s*(\S+)/m.exec(
  readFileSync(join(repoRoot, 'xcconfig/Base.xcconfig'), 'utf8')
)?.[1];
if (!bundleId) {
  console.error('APP_BUNDLE_IDENTIFIER not found in xcconfig/Base.xcconfig');
  process.exit(1);
}

function loadKey() {
  const configPath = join(homedir(), '.config/depth/app-store-connect.json');
  const file = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
  const keyId = process.env.ASC_KEY_ID || file.keyId;
  const issuerId = process.env.ASC_ISSUER_ID || file.issuerId;
  if (!keyId || !issuerId) return null;
  const keyPath = (
    process.env.ASC_KEY_PATH ||
    file.keyPath ||
    `~/.appstoreconnect/private_keys/AuthKey_${keyId}.p8`
  ).replace(/^~(?=\/)/, homedir());
  return { keyId, issuerId, privateKey: createPrivateKey(readFileSync(keyPath, 'utf8')) };
}

function token({ keyId, issuerId, privateKey }) {
  const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${b64({
    iss: issuerId,
    iat: now,
    exp: now + 600,
    aud: 'appstoreconnect-v1',
  })}`;
  // JWS needs the raw r||s signature, not node's default DER encoding.
  const signature = sign('sha256', Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${unsigned}.${signature.toString('base64url')}`;
}

async function asc(jwt, path) {
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${jwt}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body.errors?.map((e) => `${e.code}: ${e.detail || e.title}`).join('; ');
    throw new Error(`App Store Connect ${res.status} on ${path.split('?')[0]}: ${detail || res.statusText}`);
  }
  return body;
}

async function storeListing() {
  const res = await fetch(
    `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&country=us`
  );
  const result = (await res.json()).results?.[0];
  return result
    ? { version: result.version, releasedAt: result.currentVersionReleaseDate, appId: String(result.trackId) }
    : null;
}

const report = { version, bundleId, checkedAt: new Date().toISOString() };
report.store = await storeListing();
const key = loadKey();

if (key) {
  const jwt = token(key);
  const apps = await asc(jwt, `/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`);
  const appId = apps.data?.[0]?.id;
  if (!appId) throw new Error(`No App Store Connect app for ${bundleId}`);

  const builds = await asc(
    jwt,
    `/builds?filter[app]=${appId}&filter[preReleaseVersion.version]=${version}` +
      '&sort=-uploadedDate&limit=20&fields[builds]=version,processingState,uploadedDate,expired'
  );
  report.builds = builds.data.map((b) => ({
    build: b.attributes.version,
    processingState: b.attributes.processingState,
    uploadedAt: b.attributes.uploadedDate,
    expired: b.attributes.expired,
  }));

  const versions = await asc(
    jwt,
    `/apps/${appId}/appStoreVersions?filter[versionString]=${version}&filter[platform]=IOS` +
      '&include=build,appStoreVersionPhasedRelease'
  );
  const v = versions.data?.[0];
  if (v) {
    const included = versions.included || [];
    const rel = (name) => {
      const ref = v.relationships?.[name]?.data;
      return ref && included.find((i) => i.type === ref.type && i.id === ref.id);
    };
    report.appStoreVersion = {
      state: v.attributes.appVersionState || v.attributes.appStoreState,
      releaseType: v.attributes.releaseType,
      build: rel('build')?.attributes?.version ?? null,
      phasedRelease: rel('appStoreVersionPhasedRelease')?.attributes?.phasedReleaseState ?? null,
    };
  }
}

const state = report.appStoreVersion?.state;
const valid = report.builds?.some((b) => b.processingState === 'VALID' && !b.expired);
if (report.store?.version === version) report.stage = 'live';
else if (!key) report.stage = 'unknown';
else if (REJECTED_STATES.has(state)) report.stage = 'rejected';
else if (REVIEW_STATES.has(state)) report.stage = 'review';
else if (valid) report.stage = 'testflight';
else if (report.builds?.some((b) => b.processingState === 'PROCESSING')) report.stage = 'processing';
else report.stage = 'none';
if (!key) report.note = 'No App Store Connect API key configured; only the public listing was checked.';

console.log(JSON.stringify(report, null, 2));
