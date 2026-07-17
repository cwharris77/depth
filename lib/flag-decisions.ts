// Pure decide() bodies for lib/flags.ts. Kept separate so getProviderData() only
// receives flag definitions, and so Vitest can test the env contract without pulling
// in flags/next (which depends on next/headers).

export function decideShowIsolatedSearchBarIcon(env: {
  SHOW_ISOLATED_SEARCH_BAR_ICON?: string;
}): boolean {
  return env.SHOW_ISOLATED_SEARCH_BAR_ICON === '1';
}
