import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { changedMigrationFiles } from './check-ios-compatibility.mts';
import { findDestructivePatterns } from '../lib/supabase/migration-compat';

const temporaryRepos: string[] = [];

afterEach(() => {
  for (const repo of temporaryRepos.splice(0)) rmSync(repo, { recursive: true, force: true });
});

describe('changedMigrationFiles', () => {
  it('detects an added additive migration using repo-root-relative git paths', () => {
    const repo = mkdtempSync(join(tmpdir(), 'ios-compat-'));
    temporaryRepos.push(repo);
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repo });
    writeFileSync(join(repo, 'README.md'), 'base\n');
    execFileSync('git', ['add', 'README.md'], { cwd: repo });
    execFileSync('git', ['commit', '-qm', 'base'], { cwd: repo });
    const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();

    const migrationDir = join(repo, 'web', 'supabase', 'migrations');
    mkdirSync(migrationDir, { recursive: true });
    writeFileSync(
      join(migrationDir, '001_add_badges.sql'),
      'create table badges (id text primary key);\n'
    );
    execFileSync('git', ['add', 'web/supabase/migrations/001_add_badges.sql'], { cwd: repo });
    execFileSync('git', ['commit', '-qm', 'add migration'], { cwd: repo });
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();

    const runGit = (args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
    const changed = changedMigrationFiles(base, head, runGit);
    expect(changed).toEqual(['001_add_badges.sql']);
    expect(findDestructivePatterns(readFileSync(join(migrationDir, changed[0]), 'utf8'))).toEqual(
      []
    );
  });
});
