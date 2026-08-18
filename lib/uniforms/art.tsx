import { renderToStaticMarkup } from 'react-dom/server';
import UniformFigure from '@/components/UniformFigure';
import type { TeamColors } from '@/lib/types';
import type { TeamUniformDefinition } from '@/lib/uniforms/teams/types';

// DEP-220 art pipeline: deterministic, prerendered jersey thumbnails for the native iOS
// uniform picker (and, when image_path is populated, the web picker too). SwiftUI has no
// SVG decoder and the web's figures are React-rendered, not static files, so the one
// renderer both platforms already share (UniformFigure) is server-rendered once per kit
// and rasterized to WebP by scripts/gen-uniform-thumbs.mts. This module is the pure half:
// the URL scheme a kit's image lives at, and the SVG string that becomes the raster.
// Art is committed under public/uniforms/<id>.webp and served at UNIFORM_ART_BASE_URL —
// the same committed-raster precedent as scripts/gen-icons.mts.

// The Vercel production domain the iOS app already hardcodes (AppBuildInfo.swift's
// privacy page) and that the web picker's <Image src={imagePath}> resolves against.
// Kept as one module so the seed generator and the generator script can't drift apart.
export const UNIFORM_ART_BASE_URL = 'https://depth-ashen.vercel.app/uniforms';

// A uniform row's id is its stable `${teamId}-${slug}` slug, so the artifact name is
// fully determined by the row. Rows without an artifact (a future kit whose WebP hasn't
// been generated yet) simply keep the text-only fallback — degrade, don't fake.
export function uniformArtURL(id: string): string {
  return `${UNIFORM_ART_BASE_URL}/${id}.webp`;
}

// UniformFigure's number <text> carries `font-family: var(--font-anton), Anton, …` —
// a CSS custom property that only exists in the web bundle. The sharp/librsvg rasterizer
// can't resolve `var()`, so the swap below pins a rasterizer-safe stack. The visual
// result is a plain sans-serif "1" instead of the web's Anton digit — acceptable for a
// ~50pt row thumbnail, and the swap is what keeps the raster byte-identical across
// machines (a "one source of truth" requirement for a committed artifact).
const WEB_NUMBER_FONT = 'font-family:var(--font-anton), Anton, Helvetica, sans-serif';
const RASTER_NUMBER_FONT = 'font-family:Helvetica, sans-serif';

// Renders a kit's jersey-crop SVG (the web picker's variant — viewBox 20 372 560 452)
// at size 560 so the WebP stays crisp at the picker's @3x row size and beyond. Colors
// come from the uniform row itself (a kit's colors, not the team's), and the team's
// definition supplies construction geometry resolved against those colors — exactly the
// inputs the web picker's JerseySwatch consumes, so the raster can't diverge from the
// fallback it replaces.
export function renderUniformThumbSVG(
  colors: TeamColors,
  kitId: string,
  definition?: TeamUniformDefinition
): string {
  const markup = renderToStaticMarkup(
    <UniformFigure
      colors={colors}
      variant="jersey"
      size={560}
      kitId={kitId}
      definition={definition}
    />
  );
  // Both the outline and fill <text> carry the web font stack, so replace every occurrence.
  return markup.replaceAll(WEB_NUMBER_FONT, RASTER_NUMBER_FONT);
}
