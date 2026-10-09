// Guards the two facts about Carolina that nothing else can catch: the helmet mark's paint order
// (reverse any pair and the linework disappears back into the body) and the pairings enumerated
// from the 2025 composite, which only the canonical entry renders as the row's own raster.
import { describe, expect, it } from 'vitest';
import { PANTHERS_PARTS } from '../panthers';
import { PANTHERS_CATALOG } from '../panthers/catalog';
import { boundsOf } from '../core/marks';

describe('Panthers helmet parts', () => {
  const layerIds = (helmet: keyof typeof PANTHERS_PARTS.helmets) =>
    PANTHERS_PARTS.helmets[helmet].layers.map((layer) => layer.id);

  it('paints the mark silhouette, body, interior gaps, then fangs on both shells', () => {
    expect(layerIds('silver')).toEqual([
      'panthers-decal-keyline',
      'panthers-decal-body',
      'panthers-decal-detail',
      'panthers-decal-highlight',
    ]);
    expect(layerIds('black')).toEqual(layerIds('silver'));
  });

  it('takes the fang highlight from the mark, not from the kit silver', () => {
    const highlight = PANTHERS_PARTS.helmets.silver.layers.find(
      (layer) => layer.id === 'panthers-decal-highlight'
    );
    expect(highlight).toMatchObject({ kind: 'fill', fill: 'markSilver' });
    expect(PANTHERS_PARTS.palette.markSilver).not.toBe(PANTHERS_PARTS.palette.silver);
  });
});

describe('Panthers pants parts', () => {
  it('pairs each design with the pants and socks the composite shows, canonical first', () => {
    const pairs = Object.fromEntries(
      PANTHERS_CATALOG.designs.map((d) => [d.slug, d.combinations.map((c) => c.pants)])
    );
    expect(pairs).toEqual({
      home: ['black', 'blue'],
      away: ['black', 'white', 'white', 'blue', 'blue', 'silver'],
      'black-alt': ['black', 'black', 'silver'],
    });
  });

  it('keeps black canonical so the committed raster pairs the black leg', () => {
    for (const design of PANTHERS_CATALOG.designs) {
      expect(design.combinations[0].pants).toBe('black');
    }
  });

  // One `it` per leg so a failure names the offending pant, per the data-integrity convention.
  for (const [name, part] of Object.entries(PANTHERS_PARTS.pants)) {
    it(`stripes the ${name} leg with a keylined centre that stops at the hem`, () => {
      const fills = part.layers.map((layer) => (layer.kind === 'fill' ? layer.fill : layer.stroke));
      const [keyline, center] = [fills[0], fills[2]];
      expect(part.layers.map((layer) => layer.id)).toEqual([
        'panthers-pants-' + name + '-stripe-0-edge-left',
        'panthers-pants-' + name + '-stripe-0-edge-right',
        'panthers-pants-' + name + '-stripe-0-left',
        'panthers-pants-' + name + '-stripe-0-right',
      ]);
      // The stripe has to read against the leg it sits on and against its own keyline.
      expect(new Set([part.base, keyline, center]).size).toBe(3);
    });
  }
});

describe('Panthers shared collars', () => {
  for (const [jersey, color] of [
    ['blue', 'black'],
    ['white', 'black'],
    ['black', 'blue'],
  ]) {
    it(`renders the ${jersey} jersey with a filled neck opening and inset collar`, () => {
      const layers = PANTHERS_PARTS.jerseys[jersey].layers;
      expect(layers.find((layer) => layer.id.endsWith('-neck-opening'))).toMatchObject({
        surface: 'collar',
        kind: 'fill',
        fill: jersey,
      });
      expect(layers.find((layer) => layer.id.endsWith('-collar-edge'))).toMatchObject({
        surface: 'collar',
        kind: 'fill',
        fill: color,
      });
      expect(layers.find((layer) => layer.id.endsWith('-collar-placket'))).toMatchObject({
        surface: 'collar',
        kind: 'fill',
        fill: color,
      });
    });
  }
});

describe('Panthers shoulder and sleeve details', () => {
  it('reuses every helmet decal contour without changing its proportions', () => {
    const helmet = PANTHERS_PARTS.helmets.silver.layers;
    const sleeve = PANTHERS_PARTS.jerseys.blue.layers.filter(
      (layer) => layer.id.startsWith('panthers-sleeve-') && layer.id.endsWith('-left')
    );
    const box = boundsOf(helmet[0].d);
    const scale = 110 / (box[2] - box[0]);
    for (let layer = 0; layer < helmet.length; layer++) {
      const source = (helmet[layer].d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      const fitted = (sleeve[layer].d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      expect(fitted).toHaveLength(source.length);
      source.forEach((coordinate, index) => {
        const expected =
          index % 2 === 0
            ? -42 + (coordinate - box[0]) * scale
            : 527 + (coordinate - (box[1] + box[3]) / 2) * scale;
        expect(Math.abs(fitted[index] - expected)).toBeLessThanOrEqual(0.0051);
      });
    }
    expect(boundsOf(sleeve[0].d)[0]).toBeLessThan(0);
  });

  for (const jersey of ['blue', 'black', 'white']) {
    it(`adds paired shoulder numbers and clipped sleeve branding on ${jersey}`, () => {
      const layers = PANTHERS_PARTS.jerseys[jersey].layers;
      for (const side of ['left', 'right']) {
        const number = layers.find((layer) => layer.id.endsWith(`-shoulder-number-${side}`));
        expect(number).toBeDefined();
        if (!number) throw new Error(`Missing ${side} shoulder number`);
        const [x0, y0, x1, y1] = boundsOf(number.d);
        expect(x1 - x0).toBe(45);
        expect(y0).toBeGreaterThan(400);
        expect(y1).toBeLessThan(440);
        const decal = layers.filter(
          (layer) => layer.id.startsWith('panthers-sleeve-') && layer.id.endsWith(`-${side}`)
        );
        expect(decal).toHaveLength(4);
        expect(decal.every((layer) => layer.clip && layer.surface === `sleeve-${side}`)).toBe(true);
        expect(layers.find((layer) => layer.id === `panthers-nike-${side}`)).toMatchObject({
          clip: true,
          surface: `sleeve-${side}`,
          kind: 'fill',
          fill: jersey === 'white' ? 'black' : 'white',
        });
      }
    });
  }
});
