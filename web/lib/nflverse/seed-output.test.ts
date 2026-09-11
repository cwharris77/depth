import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeNflverseSeedFile } from './seed-output';

const tempDirectories: string[] = [];

function seedPath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'depth-nflverse-seed-'));
  tempDirectories.push(directory);
  return join(directory, 'seed-nflverse.sql');
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('writeNflverseSeedFile', () => {
  it.each([2025, 2024])(
    'preserves the existing seed byte-for-byte when snap season %i fails',
    (season) => {
      const path = seedPath();
      const existing = Buffer.from('-- last good seed\nselect 1;\n');
      writeFileSync(path, existing);

      expect(() =>
        writeNflverseSeedFile(path, '-- partial replacement\n', [
          { season, message: 'source unavailable' },
        ])
      ).toThrow(`snap-count season ${season} failed`);
      expect(readFileSync(path)).toEqual(existing);
    }
  );

  it('writes the complete seed when both snap seasons succeed', () => {
    const path = seedPath();

    writeNflverseSeedFile(path, '-- complete seed\n', []);

    expect(readFileSync(path, 'utf8')).toBe('-- complete seed\n');
  });
});
