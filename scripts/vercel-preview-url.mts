import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  readDotenvValue,
  VERCEL_PROTECTION_BYPASS_ENV_KEY,
  withVercelProtectionBypass,
} from '@/lib/utils/vercel-preview-bypass';

const previewUrl = process.argv[2];

if (!previewUrl) {
  console.error('Usage: npm run preview:bypass-url -- <https://preview.vercel.app/path>');
  process.exit(1);
}

const parsed = new URL(previewUrl);
const envPath = resolve(process.cwd(), process.env.DEPTH_ENV_FILE ?? '.env.local');
const dotenv = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const token =
  process.env[VERCEL_PROTECTION_BYPASS_ENV_KEY] ??
  readDotenvValue(dotenv, VERCEL_PROTECTION_BYPASS_ENV_KEY);
const bypassUrl = withVercelProtectionBypass(previewUrl, token);

if (parsed.hostname.endsWith('.vercel.app') && bypassUrl === previewUrl) {
  console.error(`Missing ${VERCEL_PROTECTION_BYPASS_ENV_KEY} in ${envPath}`);
  process.exit(1);
}

console.log(bypassUrl);
