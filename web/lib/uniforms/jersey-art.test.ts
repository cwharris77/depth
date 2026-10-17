import { describe, expect, it } from 'vitest';
import { renderUniformThumbSVG } from './art';
import { getTeamUniformDefinition } from './teams';

// The native artwork must retain its lettering without a host-installed font, and team
// construction details must not leak into the shared jersey used by the rest of the archive.
const colors = { primary: '#97233F', secondary: '#FFFFFF', accent: '#000000' };
const render = (team: string, slug: string) =>
  renderUniformThumbSVG(colors, `${team}-${slug}`, getTeamUniformDefinition(team));

describe('jersey artwork', () => {
  it.each(['home', 'away'])(
    'renders the Seahawks %s numeral with a narrow green border and feather print',
    (slug) => {
      const numeral = render('seahawks', slug).match(/<g data-number="3">.*?<\/g>/)?.[0];
      expect(numeral).toContain('stroke="#69BE28" stroke-width="8"');
      expect(numeral).toMatch(/fill="url\(#.*-pattern-seahawks-feathers-/);
      expect(numeral).not.toMatch(/fill="url\(#.*-number-mesh\)/);
    }
  );

  it('renders the Rivalries numeral with the twelve print and the throwback numeral plain', () => {
    const rivalries = render('seahawks', 'rivalries-2025').match(
      /<g data-number="3">.*?<\/g>/
    )?.[0];
    expect(rivalries).toMatch(/fill="url\(#.*-pattern-seahawks-twelves\)/);
    const throwback = render('seahawks', '1976-throwback').match(
      /<g data-number="3">.*?<\/g>/
    )?.[0];
    expect(throwback).not.toMatch(/fill="url\(#.*-number-mesh\)/);
  });

  it('renders triangle perforations on modern Broncos numerals while retaining historical mesh', () => {
    for (const slug of ['home', 'away', 'orange-alt']) {
      const svg = render('broncos', slug);
      const numeral = svg.match(/<g data-number="3">.*?<\/g>/)?.[0];
      expect(numeral).toMatch(/fill="url\(#.*-pattern-broncos-number-/);
      expect(numeral).not.toMatch(/fill="url\(#.*-number-mesh\)/);
      expect(svg).toContain('d="M3,3 L5,3 L4,5 Z"');
    }
    const historical = render('broncos', 'orange-crush').match(/<g data-number="3">.*?<\/g>/)?.[0];
    expect(historical).toMatch(/fill="url\(#.*-number-mesh\)/);
  });

  it('renders the generic number as font-independent vector artwork', () => {
    const svg = renderUniformThumbSVG(colors, 'unknown-home');
    expect(svg).not.toContain('<text');
    expect(svg).toContain('data-number="3"');
  });

  it.each(['home', 'away', 'black-alt', 'rivalries-2025'])(
    'renders the Cardinals %s collar lettering as paths',
    (slug) => {
      const svg = render('cardinals', slug);
      expect(svg).toContain('cardinals-collar-seam');
      expect(svg).not.toContain('<text');
      expect(svg).toContain('cardinals-neck');
    }
  );

  it('keeps eggshell fabric texture local to its jersey', () => {
    const eggshell = render('cardinals', 'rivalries-2025');
    expect(eggshell).toContain('cardinals-speckles');
    expect(eggshell).toBe(render('cardinals', 'rivalries-2025'));
    expect(render('cardinals', 'home')).not.toContain('cardinals-speckles');
    expect(render('seahawks', 'home')).not.toContain('cardinals-');
  });
});
