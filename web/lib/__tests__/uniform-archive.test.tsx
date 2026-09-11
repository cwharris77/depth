import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import UniformArchive from '@/components/UniformArchive';
import type { UniformListing } from '@/lib/roster-source';
import type { TeamUniformDefinition } from '@/lib/uniforms/teams/types';

vi.mock('next/navigation', () => ({
  usePathname: () => '/uniforms',
  useRouter: () => ({ push: vi.fn() }),
}));

const colors = {
  primary: '#002244',
  secondary: '#69BE28',
  accent: '#A5ACAF',
  uiAccent: '#69BE28',
  onAccent: '#000000',
};

const kit: UniformListing = {
  teamId: 'constructor',
  teamName: 'Prototype Keys',
  conference: 'AFC',
  division: 'East',
  id: 'constructor-home-2025',
  kind: 'home',
  name: 'Home',
  colors,
  yearStart: 2025,
  yearEnd: null,
  isCurrent: true,
};

const inheritedDefinition: TeamUniformDefinition = {
  teamId: 'constructor',
  kits: {
    home: {
      layers: [
        {
          id: 'inherited-prototype-layer',
          surface: 'jersey',
          d: 'M1,1 L2,2 Z',
          clip: true,
          kind: 'fill',
          fill: 'accent',
        },
      ],
    },
  },
};

describe('UniformArchive', () => {
  it('does not render a definition inherited through a prototype key', () => {
    const definitions = Object.create({
      constructor: inheritedDefinition,
    }) as Record<string, TeamUniformDefinition>;

    const markup = renderToStaticMarkup(
      <UniformArchive kits={[kit]} teams={[]} definitions={definitions} />
    );

    expect(markup).not.toContain('data-layer-id="inherited-prototype-layer"');
  });
});
