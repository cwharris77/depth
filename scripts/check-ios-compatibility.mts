#!/usr/bin/env node
/**
 * iOS backend-compatibility guard — enforces CLAUDE.md invariant 11 ("published data
 * stays decodable by every supported app build") at PR time instead of relying on
 * memory. An installed App Store build outruns CI by weeks; a migration that drops or
 * renames a column the last build still SELECTs breaks real users the moment the
 * Supabase git integration applies it (the 2026-08-24 TestFlight failure was exactly
 * this: `drop pending_home_colors` landed while an old TestFlight binary still
 * selected the legacy columns).
 *
 * The scan rules live in lib/supabase/migration-compat.ts (tested); this script is
 * the I/O glue: git diff -> scan -> verdict. The guard is deliberately a conservative
 * denylist, not a SQL parser. An unusual but safe migration that trips it is a
 * five-minute annotation; a pattern the denylist missed that needs shipping is a
 * broken release. When it finds a destructive change it requires two things in the
 * same PR:
 *
 *   1. A `-- IOS-COMPATIBILITY:` annotation on the migration naming the App Store
 *      build the change is safe after and the gate minimum it pairs with (shape in
 *      ios-release-compatibility.md).
 *   2. A diff to ios-release-compatibility.md — the release contract must be
 *      reviewable, not remembered.
 *
 * Passing here is not a license to ship. The sequencing in the vault's
 * Reference/forced-update-gate.md
 * still governs: build LIVE in the App Store -> arm the gate -> only then break the
 * schema. This script only proves the PR is *aware and documented*, not that the
 * document's build is actually out.
 *
 * Usage:
 *   npm run check:ios-compat                        # auto-detect the diff base
 *   npm run check:ios-compat -- --base origin/main  # explicit base
 *   npm run check:ios-compat -- --base <sha> --head <sha>
 *
 * Exit 0 = no destructive change, or destructive changes are annotated and
 *          documented. Exit 1 = a destructive change is missing either.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compatibilityAnnotation, findDestructivePatterns } from '@/lib/supabase/migration-compat';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations');
const MANIFEST_PATH = 'ios-release-compatibility.md'; // repo root — /docs/ is gitignored

// --- CLI args ---------------------------------------------------------------

function parseArgs() {
  const argv = process.argv.slice(2);
  const args: { base?: string; head?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base' && i + 1 < argv.length) args.base = argv[i + 1];
    if (argv[i] === '--head' && i + 1 < argv.length) args.head = argv[i + 1];
  }
  return args;
}

// --- git diff ---------------------------------------------------------------

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8' });
}

/** Names of migration files changed since the base ref, repo-root relative. */
function changedMigrationFiles(base: string, head: string): string[] {
  const baseSha = git(['rev-parse', '--verify', '--quiet', base]);
  if (!baseSha) {
    console.error(
      `Base ref "${base}" does not resolve — pass --base (e.g. origin/main or the PR base SHA).`
    );
    process.exit(1);
  }
  const names = git(['diff', '--name-only', `${base}...${head || 'HEAD'}`]).trim();
  if (!names) return [];
  return names
    .split('\n')
    .filter((f) => f.startsWith('supabase/migrations/') && f.endsWith('.sql'))
    .map((f) => f.replace('supabase/migrations/', ''));
}

function defaultBase(): string {
  if (process.env.GITHUB_BASE_REF) return `origin/${process.env.GITHUB_BASE_REF}`;
  const candidates = ['origin/main', 'origin/master', 'HEAD~1'];
  for (const candidate of candidates) {
    try {
      git(['rev-parse', '--verify', '--quiet', candidate]);
      return candidate;
    } catch {
      // try the next candidate
    }
  }
  return 'HEAD~1';
}

function manifestChangedInPr(base: string, head: string): boolean {
  const names = git(['diff', '--name-only', `${base}...${head || 'HEAD'}`]).trim();
  return names.split('\n').includes(MANIFEST_PATH);
}

// --- main ---------------------------------------------------------------------

function main() {
  const { base: baseArg, head: headArg } = parseArgs();
  const base = baseArg ?? defaultBase();
  const head = headArg ?? 'HEAD';
  const changed = changedMigrationFiles(base, head);

  if (changed.length === 0) {
    console.log(`check:ios-compat — no migration changes vs ${base}, nothing to guard.`);
    process.exit(0);
  }

  console.log(`check:ios-compat — ${changed.length} migration(s) changed vs ${base}:`);
  let destructive = 0;
  let annotationMissing = false;

  for (const file of changed) {
    const path = join(MIGRATIONS_DIR, file);
    let content: string;
    try {
      content = readFileSync(path, 'utf-8');
    } catch {
      console.error(
        `  !! cannot read ${file} (deleted in this PR?) — deleted migrations are themselves a compatibility event; flag for review.`
      );
      destructive++;
      annotationMissing = true;
      continue;
    }

    const found = findDestructivePatterns(content);
    if (found.length === 0) {
      console.log(`  ok  ${file} — no destructive patterns`);
      continue;
    }

    destructive++;
    console.log(`  !!  ${file} — destructive: ${found.join(', ')}`);
    const annotation = compatibilityAnnotation(content);
    if (!annotation.present) {
      annotationMissing = true;
      for (const issue of annotation.issues) console.log(`      ✗ ${issue}`);
    } else {
      for (const issue of annotation.issues) {
        annotationMissing = true;
        console.log(`      ✗ annotation: ${issue}`);
      }
      if (annotation.issues.length === 0)
        console.log(`      ✓ IOS-COMPATIBILITY annotation present and complete`);
    }
  }

  if (destructive === 0) {
    console.log('check:ios-compat — ok, no destructive schema changes.');
    process.exit(0);
  }

  console.log('');

  if (annotationMissing) {
    console.log(
      'check:ios-compat — FAIL: destructive migration(s) missing a complete compatibility annotation.'
    );
    console.log('Annotation shape (ios-release-compatibility.md):');
    console.log('  -- IOS-COMPATIBILITY:');
    console.log('  -- Safe after App Store build <N> is LIVE.');
    console.log('  -- Gate minimum: <N>.');
    console.log('  -- Old behavior preserved until then: yes/no.');
    console.log('  -- Rollback: <specific steps>');
    console.log('✗ check:ios-compat FAILED.');
    process.exit(1);
  }

  // A deleted migration can't carry an annotation (handled above) — every surviving
  // destructive file is annotated; the manifest is what still needs to move with the
  // behavior (CLAUDE.md: "docs move with behavior").
  console.log('check:ios-compat — destructive change(s) found, annotations complete.');
  if (!manifestChangedInPr(base, head)) {
    console.error(`  ✗ ${MANIFEST_PATH} was not updated in this PR.`);
    console.error('    Every destructive change must update the release contract:');
    console.error(
      '    current App Store build, min supported build, contract delta, rollback plan.'
    );
    console.log('✗ check:ios-compat FAILED.');
    process.exit(1);
  }

  console.log(`  ✓ ${MANIFEST_PATH} updated in this PR.`);
  console.log('  ✓ check:ios-compat passed — change is annotated and documented.');
  console.log('');
  console.log('Remember: passing this guard is not approval to ship — the build must be');
  console.log('LIVE in the App Store and the forced-update gate armed first, per');
  console.log(
    'the vault sequencing doc (../obsidian/Projects/depth/Reference/forced-update-gate.md).'
  );
  console.log('✓ check:ios-compat PASSED.');
  process.exit(0);
}

main();
