import { renderToStaticMarkup } from 'react-dom/server';
import UniformFigure, { type UniformArtVariant } from '@/components/UniformFigure';
import type { JerseyColors } from '@/lib/types';
import type { TeamUniformDefinition } from '@/lib/uniforms/teams/types';

// DEP-220 art pipeline: deterministic, prerendered uniform rasters for the native iOS
// app (and, when image_path is populated, the web). SwiftUI has no SVG decoder and the
// web's figures are React-rendered, not static files, so the one renderer both platforms
// already share (UniformFigure) is server-rendered once per kit and rasterized to WebP by
// scripts/gen-uniform-thumbs.mts. This module is the pure half: the URL scheme a kit's
// image lives at, and the SVG string that becomes the raster. Art is committed under
// public/uniforms/<id>.webp (jersey crop, picker) and public/uniforms/<id>-full.webp
// (full mannequin, archive) — the same committed-raster precedent as scripts/gen-icons.mts.

// The Vercel production domain the iOS app already hardcodes (AppBuildInfo.swift's
// privacy page) and that the web picker's <Image src={imagePath}> resolves against.
// Kept as one module so the seed generator and the generator script can't drift apart.
export const UNIFORM_ART_BASE_URL = 'https://depth-ashen.vercel.app/uniforms';

// A uniform row's id is its stable `${teamId}-${slug}-${yearStart}` slug, so the artifact name is
// fully determined by the row. Rows without an artifact (a future kit whose WebP hasn't
// been generated yet) simply keep the text-only fallback — degrade, don't fake.
export function uniformArtURL(id: string): string {
  return `${UNIFORM_ART_BASE_URL}/${id}.webp`;
}

// The full-mannequin raster (helmet → cleats) backing the archive, distinct from the
// jersey crop above. UniformArchive passes its kit's `-full` URL to the figure so the
// archive shows the whole uniform, matching the pre-DEP-220 inline SVG it replaced —
// DEP-220 only produced the jersey crop, and pointing the archive at that square crop
// stretches it into the broken mannequin (see UniformFigure's imagePath short-circuit).
export function uniformArtFullURL(id: string): string {
  return `${UNIFORM_ART_BASE_URL}/${id}-full.webp`;
}

// UniformFigure's number <text> carries `font-family: var(--font-anton), Anton, …` —
// a CSS custom property that only exists in the web bundle. The sharp/librsvg rasterizer
// can't resolve `var()`, so the swap below pins a rasterizer-safe stack. The visual
// result is a plain sans-serif "1" instead of the web's Anton digit — acceptable for a
// ~50pt row thumbnail, and the swap is what keeps the raster byte-identical across
// machines (a "one source of truth" requirement for a committed artifact).
const WEB_NUMBER_FONT = 'font-family:var(--font-anton), Anton, Helvetica, sans-serif';
const RASTER_NUMBER_FONT = 'font-family:Helvetica, sans-serif';

// Renders a kit's SVG to the deterministic WebP raster. `variant` selects which the
// caller wants: 'jersey' (the web picker swatch — viewBox 20 372 560 452) or 'full'
// (the archive mannequin — viewBox 20 45 560 1535). Render size 560 keeps the raster
// crisp at the picker's @3x row size and beyond. Colors come from the uniform row itself
// (a kit's colors, not the team's), and the team's definition supplies construction
// geometry resolved against those colors — exactly the inputs the web renders, so the
// raster can't diverge from the fallback it replaces.
export function renderUniformThumbSVG(
  colors: JerseyColors,
  kitId: string,
  definition?: TeamUniformDefinition,
  variant: UniformArtVariant = 'jersey'
): string {
  const markup = renderToStaticMarkup(
    <UniformFigure
      colors={colors}
      variant={variant}
      size={560}
      kitId={kitId}
      definition={definition}
    />
  );
  // Both the outline and fill <text> carry the web font stack, so replace every occurrence.
  return markup.replaceAll(WEB_NUMBER_FONT, RASTER_NUMBER_FONT);
}
