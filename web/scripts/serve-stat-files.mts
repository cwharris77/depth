// Serves the local stat-file tree the publisher writes (`web/.stat-files/` by default) over
// plain HTTP, so the iOS read (DEP-542) and the builders can exercise the real object layout
// and headers without Cloudflare credentials. The request handling lives in
// `lib/stat-files/serve.ts`; this file is the thin listen/serve glue.
//
// Usage (from web/):
//   npm run stat-files:serve                       # 127.0.0.1:54330 over .stat-files
//   npm run stat-files:serve -- --port 8080 --root /tmp/stat-files
//
// Then, for example:
//   curl -sD - http://127.0.0.1:54330/v1/players/3139477/seasons.json | gunzip

import { resolve } from 'node:path';
import { createStatFileServer } from '@/lib/stat-files/serve';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 54330;
const DEFAULT_ROOT = '.stat-files';

function flagValue(argv: string[], flag: string, fallback: string): string {
  const index = argv.indexOf(flag);
  return index === -1 ? fallback : argv[index + 1];
}

const argv = process.argv.slice(2);
const root = resolve(flagValue(argv, '--root', DEFAULT_ROOT));
const host = flagValue(argv, '--host', DEFAULT_HOST);
const port = Number(flagValue(argv, '--port', String(DEFAULT_PORT)));

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`invalid --port: ${flagValue(argv, '--port', String(DEFAULT_PORT))}`);
  process.exit(1);
}

const handle = createStatFileServer({ root });
const bound = await handle.listen(port, host);
console.log(`serving stat files from ${root}`);
console.log(`  http://${host}:${bound.port}/v1/manifest.json`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void handle.close().then(() => process.exit(0));
  });
}
