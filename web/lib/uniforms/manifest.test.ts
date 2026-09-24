import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { uniformArtFullURL, uniformArtURL } from '@/lib/uniforms/art';
import {
  ARTIFACT_MANIFEST_RELATIVE_PATH,
  ARTIFACT_MANIFEST_PUBLIC_PATH,
  WEB_ROOT,
  buildArtifactManifest,
  computeSourceDigest,
  diffArtifactManifest,
  sha256Hex,
  type ArtifactManifest,
  type ManifestRowInput,
} from '@/lib/uniforms/manifest';
import { buildRowsFromCatalog, combinationRenders } from '@/scripts/gen-uniform-thumbs.mts';
import { getTeamCatalog } from '@/lib/uniforms/teams/catalogs';
import type { TeamCatalog } from '@/lib/uniforms/teams/core/catalog';

// The committed manifest is the publication record for the committed rasters.
// These tests pin the two failures the manifest exists to catch — a raster whose bytes moved
// without regenerating the manifest, and a source/build input that changed without a regen —
// and the delivery contract (origin-relative path + revision query).

const UNIFORM_DIR = join(WEB_ROOT, 'public', 'uniforms');
const committed = JSON.parse(
  readFileSync(join(WEB_ROOT, ARTIFACT_MANIFEST_RELATIVE_PATH), 'utf8')
) as ArtifactManifest;

// Recomputes the generator's inputs by reading the committed raster bytes from disk. A stale
// manifest disagrees on a sha256 (raster changed) or sourceDigest (an authoring/renderer/tool
// input changed).
function rowInputsFromDisk(): ManifestRowInput[] {
  return committed.rows.map((row) => {
    const read = (path: string) => readFileSync(join(UNIFORM_DIR, basename(path)));
    return {
      catalogId: row.catalogId,
      constructionKey: row.constructionKey,
      jersey: {
        path: row.artifacts.jersey.path,
        sha256: sha256Hex(read(row.artifacts.jersey.path)),
      },
      full: { path: row.artifacts.full.path, sha256: sha256Hex(read(row.artifacts.full.path)) },
      ...(row.combinations?.length
        ? {
            combinations: row.combinations.map((c) => ({
              key: c.key,
              label: c.label,
              full: { path: c.full.path, sha256: sha256Hex(read(c.full.path)) },
            })),
          }
        : {}),
    };
  });
}

function manifestFromDisk(): ArtifactManifest {
  return buildArtifactManifest(computeSourceDigest(WEB_ROOT), rowInputsFromDisk());
}

describe('committed artifact manifest', () => {
  it('matches the committed rasters byte-for-byte', () => {
    expect(diffArtifactManifest(committed, manifestFromDisk())).toEqual([]);
  });

  it('records the current source/build digest', () => {
    expect(committed.sourceDigest).toBe(computeSourceDigest(WEB_ROOT));
  });

  it('declares exactly the WebPs committed under public/uniforms/', () => {
    const onDisk = readdirSync(UNIFORM_DIR)
      .filter((name) => name.endsWith('.webp'))
      .sort();
    const declared = committed.rows
      .flatMap((row) => [
        basename(row.artifacts.jersey.path),
        basename(row.artifacts.full.path),
        ...(row.combinations?.map((c) => basename(c.full.path)) ?? []),
      ])
      .sort();
    expect(onDisk).toEqual(declared);
  });

  it('keeps every artifact path origin-relative and every hash a full SHA-256', () => {
    expect(committed.rows.length).toBeGreaterThan(0);
    for (const row of committed.rows) {
      expect(row.constructionKey.trim()).not.toBe('');
      expect(row.revision).toMatch(/^[0-9a-f]{16}$/);
      for (const artifact of [
        row.artifacts.jersey,
        row.artifacts.full,
        ...(row.combinations?.map((c) => c.full) ?? []),
      ]) {
        expect(artifact.path).toMatch(/^\/uniforms\/[a-z0-9-]+\.webp$/);
        expect(artifact.path).not.toMatch(/^https?:\/\//);
        expect(artifact.sha256).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });

  it('is deterministic — rebuilding from the same inputs reproduces it', () => {
    expect(buildArtifactManifest(computeSourceDigest(WEB_ROOT), rowInputsFromDisk())).toEqual(
      committed
    );
  });
});

describe('artifact skew detection', () => {
  it('flags a changed raster whose manifest hash is stale', () => {
    const actual = manifestFromDisk();
    const stale: ArtifactManifest = {
      ...actual,
      rows: actual.rows.map((row, index) =>
        index === 0
          ? {
              ...row,
              artifacts: {
                ...row.artifacts,
                jersey: { ...row.artifacts.jersey, sha256: sha256Hex('corrected raster bytes') },
              },
            }
          : row
      ),
    };
    const diffs = diffArtifactManifest(stale, actual);
    expect(diffs.some((line) => line.startsWith(`${actual.rows[0].catalogId}: jersey`))).toBe(true);
  });

  it('flags a changed source/build input with an unregenerated manifest', () => {
    const actual = manifestFromDisk();
    const stale: ArtifactManifest = { ...actual, sourceDigest: sha256Hex('a different build') };
    expect(
      diffArtifactManifest(stale, actual).some((line) => line.startsWith('sourceDigest:'))
    ).toBe(true);
  });
});

describe('combinations', () => {
  const art = (name: string) => ({ path: `/uniforms/${name}`, sha256: sha256Hex(name) });
  const base: ManifestRowInput = {
    catalogId: 'seahawks-home-2012',
    constructionKey: 'home',
    jersey: art('seahawks-home-2012.webp'),
    full: art('seahawks-home-2012-full.webp'),
  };
  const withCombo: ManifestRowInput = {
    ...base,
    combinations: [
      {
        key: 'white-pants',
        label: 'White pants',
        full: art('seahawks-home-2012--white-pants-full.webp'),
      },
    ],
  };

  it('omits the field when a row has no extra combinations', () => {
    const [row] = buildArtifactManifest('digest', [base]).rows;
    expect(row).not.toHaveProperty('combinations');
    expect(
      buildArtifactManifest('digest', [{ ...base, combinations: [] }]).rows[0]
    ).not.toHaveProperty('combinations');
  });

  it('lists extra combinations without moving the row revision', () => {
    const [plain] = buildArtifactManifest('digest', [base]).rows;
    const [combo] = buildArtifactManifest('digest', [withCombo]).rows;
    expect(combo.combinations).toEqual(withCombo.combinations);
    expect(combo.revision).toBe(plain.revision);
  });

  it('flags a stale, missing or unexpected combination artifact', () => {
    const actual = buildArtifactManifest('digest', [withCombo]);
    const stale = buildArtifactManifest('digest', [
      {
        ...withCombo,
        combinations: [
          {
            ...withCombo.combinations![0],
            full: { ...withCombo.combinations![0].full, sha256: sha256Hex('x') },
          },
        ],
      },
    ]);
    expect(diffArtifactManifest(stale, actual)).toContain(
      'seahawks-home-2012: combination white-pants sha256 changed (manifest is stale)'
    );
    expect(diffArtifactManifest(buildArtifactManifest('digest', [base]), actual)).toContain(
      'seahawks-home-2012: combination white-pants has no manifest entry'
    );
    expect(diffArtifactManifest(actual, buildArtifactManifest('digest', [base]))).toContain(
      'seahawks-home-2012: combination white-pants has no committed raster'
    );
  });
});

describe('combinationRenders', () => {
  it('yields a render for each extra combination in a design', () => {
    const fixtureCatalog: TeamCatalog = {
      teamId: 'seahawks',
      designs: [
        {
          slug: 'home',
          name: 'Home',
          kind: 'home',
          jersey: 'navy',
          colors: { primary: '#002244', secondary: '#69BE28', accent: '#A5ACAF' },
          legacyAccent: { uiAccent: '#69BE28', onAccent: '#0a0e1a' },
          periods: [{ from: 2012 }],
          combinations: [
            { key: 'standard', label: 'Standard', helmet: 'navy-hawk', pants: 'navy' },
            { key: 'white-pants', label: 'White pants', helmet: 'navy-hawk', pants: 'white' },
          ],
        },
      ],
    };
    const rows = [{ id: 'seahawks-home-2012', teamId: 'seahawks', slug: 'home' }];
    expect(
      combinationRenders(rows, (teamId) => (teamId === 'seahawks' ? fixtureCatalog : undefined))
    ).toEqual([
      {
        rowId: 'seahawks-home-2012',
        key: 'white-pants',
        label: 'White pants',
        constructionKey: 'home--white-pants',
        fileName: 'seahawks-home-2012--white-pants-full.webp',
      },
    ]);
  });

  it('yields nothing for the committed rows today', () => {
    expect(combinationRenders(buildRowsFromCatalog(), getTeamCatalog)).toEqual([]);
  });
});

describe('artifact delivery URL', () => {
  it('matches the runtime URL scheme, origin-relative and revision-addressable', () => {
    for (const row of committed.rows) {
      expect(row.artifacts.jersey.path).toBe(uniformArtURL(row.catalogId));
      expect(row.artifacts.full.path).toBe(uniformArtFullURL(row.catalogId));
      expect(uniformArtURL(row.catalogId, row.revision)).toBe(
        `${row.artifacts.jersey.path}?rev=${row.revision}`
      );
      expect(uniformArtURL(row.catalogId, row.revision)).toMatch(
        /^\/uniforms\/[a-z0-9-]+\.webp\?rev=[0-9a-f]{16}$/
      );
    }
  });

  it('serves the manifest itself origin-relative', () => {
    expect(ARTIFACT_MANIFEST_PUBLIC_PATH).toBe('/uniforms/manifest.json');
  });
});
