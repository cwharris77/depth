import { describe, expect, it } from 'vitest';
import { UNIFORMS } from '../../data';
import {
  CONSTRUCTION_PROVENANCE,
  UNSOURCED_PROVENANCE,
  findUnrecordedConstructions,
  findInvalidReferencePackets,
  findUnsourcedConstructions,
  getConstructionProvenance,
} from '../core/provenance';

// Provenance is the historical-accuracy ledger, separate from reproducibility (identical pixels)
// and from review status. These tests pin the properties the Astra review asked for: the registry
// covers every archive construction, no record claims an observed fact without naming a source,
// and no record embeds a reference image instead of pointing at it.

describe('construction provenance registry', () => {
  it('covers every constructionKey in data.ts', () => {
    const missing = UNIFORMS.filter(
      (row) => getConstructionProvenance(row.teamId, row.constructionKey) === undefined
    );
    expect(missing.map((row) => `${row.teamId}/${row.constructionKey}`)).toEqual([]);
  });

  it('never claims observed facts without a source', () => {
    const offenders = Object.entries(CONSTRUCTION_PROVENANCE).flatMap(([teamId, byKey]) =>
      Object.entries(byKey)
        .filter(([, record]) => record.observed.length > 0 && record.sources.length === 0)
        .map(([key]) => `${teamId}/${key}`)
    );
    expect(offenders).toEqual([]);
  });

  it('points at references instead of embedding them', () => {
    const embedded = Object.entries(CONSTRUCTION_PROVENANCE).flatMap(([teamId, byKey]) =>
      Object.entries(byKey)
        .filter(([, record]) => record.sources.some((source) => source.startsWith('data:')))
        .map(([key]) => `${teamId}/${key}`)
    );
    expect(embedded).toEqual([]);
  });
});

describe('unsourced placeholder', () => {
  it('is the single marker: no sources, unreviewed, fidelity unverified', () => {
    expect(UNSOURCED_PROVENANCE.sources).toEqual([]);
    expect(UNSOURCED_PROVENANCE.observed).toEqual([]);
    expect(UNSOURCED_PROVENANCE.review).toEqual({ status: 'unreviewed', approved: false });
    expect(UNSOURCED_PROVENANCE.fidelity).toBe('unverified');
  });

  it('keeps approval and fidelity separate: an approved approximation stays approximate', () => {
    const record = getConstructionProvenance('seahawks', 'rivalries-2025');
    expect(record?.review.approved).toBe(true);
    expect(record?.fidelity).toBe('approximate');
  });
});

describe('sourced records', () => {
  it('records the Seahawks Rivalries measured vs. inferred facts', () => {
    const record = getConstructionProvenance('seahawks', 'rivalries-2025');
    expect(record?.sources.length).toBeGreaterThan(0);
    expect(record?.observed.join(' ')).toMatch(/dash motif/i);
    expect(record?.inferred.length).toBeGreaterThan(0);
    expect(record?.approximations.length).toBeGreaterThan(0);
    expect(record?.unresolved.length).toBeGreaterThan(0);
    expect(record?.referencePacket?.requiredFeatures).toContain('collar');
    expect(record?.referencePacket?.sources.map((source) => source.role)).toContain(
      'official-detail'
    );
  });

  it('distinguishes the Eagles original and modern constructions', () => {
    const original = getConstructionProvenance('eagles', 'kelly-green-original');
    const modern = getConstructionProvenance('eagles', 'kelly-green-modern');
    expect(original).toBeDefined();
    expect(modern).toBeDefined();
    expect(original).not.toBe(modern);
    expect(original?.observed.join(' ')).toMatch(/rounded collar/i);
    expect(modern?.observed.join(' ')).toMatch(/deep collar/i);
  });
});

describe('shipping gate', () => {
  it('flags a construction with no registry entry', () => {
    const unrecorded = findUnrecordedConstructions([
      { id: 'eagles-kelly-green-1987', teamId: 'eagles', constructionKey: 'kelly-green-original' },
      { id: 'new-kit-2026', teamId: 'eagles', constructionKey: 'brand-new' },
    ]);
    expect(unrecorded.map((row) => row.id)).toEqual(['new-kit-2026']);
  });

  it('flags unsourced constructions for review without blocking them', () => {
    const unsourced = findUnsourcedConstructions([
      { id: 'ravens-home-1996', teamId: 'ravens', constructionKey: 'home' },
      { id: 'seahawks-rivalries-2025', teamId: 'seahawks', constructionKey: 'rivalries-2025' },
    ]);
    expect(unsourced.map((row) => row.id)).toEqual(['ravens-home-1996']);
  });

  it('rejects a signature packet with uncovered required features', () => {
    const invalid = findInvalidReferencePackets([
      { id: 'seahawks-rivalries-2025', teamId: 'seahawks', constructionKey: 'rivalries-2025' },
    ]);
    expect(invalid).toEqual([]);
  });
});
