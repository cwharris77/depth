import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guard: UI-chrome colors must come from components/ui/tokens.ts, never raw literals in a
// surface file (spec 2026-07-18 decision 1). Ratchet: files still carrying literals are
// listed below and removed as each is migrated; a listed file that is ALREADY clean also
// fails, forcing the list to shrink. Team colors (lib/colors.ts) are dynamic — not matched.
const CHROME_HEX =
  /#(?:f0f4ff|dfe5f0|a5acaf|7d848c|5a616a|5b6478|5f6b7a|0f1623|161c2c|222b3d|0a0e1a|69be28|ff6b6b|4fc3f7|ef5350|c8cdd6)\b/i;
const WHITE_ALPHA = /rgba\(255,\s*255,\s*255,/i;
const BLACK_ALPHA = /rgba\(0,\s*0,\s*0,/i;

const ROOTS = ['components', 'app'];
const EXEMPT = new Set(['components/ui/tokens.ts']);

// Files not yet migrated. DELETE your file here as part of its surface task.
// NOTE: components/ui/Menu.tsx has intentional component-level boxShadow (not a surface file).
const MIGRATED_ALLOWLIST = new Set<string>([
  'components/DepthChartField.tsx',
  'components/TeamScheduleView.tsx',
  'components/UniformArchive.tsx',
  'components/UniformSheet.tsx',
  'components/NavDrawer.tsx',
  'components/TeamPageHeader.tsx',
  'components/DepthMark.tsx',
  'components/SharedBoardBanner.tsx',
  'components/IOSInstallHint.tsx',
  'components/ServiceWorkerRegistrar.tsx',
  'components/PlayerDot.tsx',
  'components/BottomSheet.tsx',
  'components/FullScreenSheet.tsx',
  'components/ui/Avatar.tsx',
  'components/ui/Button.tsx',
  'components/ui/FilterPill.tsx',
  'components/ui/IconButton.tsx',
  'components/ui/Menu.tsx',
  'components/ui/SegmentedControl.tsx',
  'components/ui/Toggle.tsx',
  'app/not-found.tsx',
  'app/team/[id]/loading.tsx',
  'app/opengraph-image.tsx',
  'app/team/[id]/opengraph-image.tsx',
  'app/globals.css',
  'app/layout.tsx',
  'app/manifest.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

function hasChromeLiteral(src: string): boolean {
  return CHROME_HEX.test(src) || WHITE_ALPHA.test(src) || BLACK_ALPHA.test(src);
}

describe('design-token guard', () => {
  const files = ROOTS.flatMap((r) => walk(r)).filter((f) => !EXEMPT.has(f));

  it('no chrome literals outside tokens.ts except allow-listed files', () => {
    const offenders = files.filter(
      (f) => !MIGRATED_ALLOWLIST.has(f) && hasChromeLiteral(readFileSync(f, 'utf8'))
    );
    expect(offenders, `Migrate these to tokens.ts imports:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('allow-list has no stale (already-clean) entries', () => {
    const stale = [...MIGRATED_ALLOWLIST].filter((f) => !hasChromeLiteral(readFileSync(f, 'utf8')));
    expect(
      stale,
      `Remove these from MIGRATED_ALLOWLIST — already clean:\n${stale.join('\n')}`
    ).toEqual([]);
  });
});
