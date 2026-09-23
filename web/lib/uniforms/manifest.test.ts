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
      .flatMap((row) => [basename(row.artifacts.jersey.path), basename(row.artifacts.full.path)])
      .sort();
    expect(onDisk).toEqual(declared);
  });

  it('keeps every artifact path origin-relative and every hash a full SHA-256', () => {
    expect(committed.rows.length).toBeGreaterThan(0);
    for (const row of committed.rows) {
      expect(row.constructionKey.trim()).not.toBe('');
      expect(row.revision).toMatch(/^[0-9a-f]{16}$/);
      for (const artifact of [row.artifacts.jersey, row.artifacts.full]) {
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
