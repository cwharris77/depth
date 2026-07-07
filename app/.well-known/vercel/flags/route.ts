import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';
import * as flags from '@/lib/flags';

// Flags Explorer discovery endpoint: lets the Vercel Toolbar list this app's flags and
// set per-session overrides in previews. Auth is built in — requests are verified
// against FLAGS_SECRET, so this exposes nothing publicly.
export const GET = createFlagsDiscoveryEndpoint(async () => getProviderData(flags));
