import { useId } from 'react';
import Image from 'next/image';
import type { JerseyColors } from '@/lib/types';
import { variantSpec, type UniformVariant } from '@/lib/uniforms/figure';
import {
  HELMET_ART,
  HELMET_ART_CLIP,
  HELMET_ART_CUT,
  HELMET_ART_TRANSFORM,
  type HelmetArtPath,
} from '@/lib/uniforms/helmet-art';
import { shadeFor } from '@/lib/uniforms/helmet-shading';
import { JERSEY_NUMBER_THREE } from '@/lib/uniforms/jersey-art';
import { resolveUniformModel, type ResolvedUniformStyle } from '@/lib/uniforms/model';
import type { TeamUniformDefinition, UniformSurface } from '@/lib/uniforms/teams/types';

// The raster variants the prerender pipeline (lib/uniforms/art.tsx) and the live renderer
// share: 'jersey' (picker swatch) or 'full' (archive mannequin). Re-exported so art.tsx
// stays the single authority on which variant name means which artifact.
export type UniformArtVariant = Extract<UniformVariant, 'jersey' | 'full'>;

// The generated vector uniform. Colors/striping/layout are facts (not copyrightable), so every
// kit is drawn from its JerseyColors — zero external image assets. Team modules may additionally
// supply a helmet decal path; those are team marks reproduced for identification, and each starts
// life as a machine trace flagged TRACE-PENDING-STYLIZE until it is hand-stylized. One renderer
// backs the picker (variant="jersey") and the archive (variant="full"); a variant is a viewBox
// crop over one shared full-body mannequin. A committed image (imagePath) overrides the figure.
//
// Geometry is ported from the "uniform vectorization with color regions" handoff (Claude
// Design), itself modeled on the CC BY 3.0 Wikimedia uniform template by JohnnySeoul (see
// ATTRIBUTIONS.md). Team modules own optional construction layers; this component only resolves
// their typed model and assembles surfaces in the mannequin's shared paint order.
//
// Color contract: primary = helmet shell / jersey body / pants; secondary = helmet + sleeve +
// pant stripes and the number outline; accent = shoulder yoke + helmet stripe; number fill =
// readableTextOn(primary) so it stays legible on any body color. Helmet shell and facemask paths
// re-light their model surface color; only physical hardware keeps the source art's neutral fills.

const OUTLINE = '#8a9096';

// Shared mannequin paths (template coordinate space; viewBox origin 20,45).
const GEO = {
  jersey:
    'M201,383 388,383 408,395 466,403 510,417 533,430 554,453 558,465 558,559 554,563 554,582 544,589 454,589 446,603 446,644 450,683 440,696 440,773 432,793 413,806 175,806 155,792 148,773 148,697 138,683 141,601 136,591 44,589 34,582 34,563 30,559 30,464 40,445 59,427 78,417 122,403 181,395 200,384Z',
  pants:
    'M176,807 412,807 417,811 423,825 432,836 443,909 458,921 461,940 474,1044 474,1059 460,1077 460,1097 470,1133 470,1196 359,1196 294,1025 229,1196 118,1196 118,1133 128,1097 128,1077 117,1066 113,1050 129,923 145,909 155,839 170,812 175,808Z',
  shinL:
    'M118,1197 228,1197 215,1228 226,1262 226,1309 222,1330 196,1404 191,1459 118,1459 118,1391 109,1331 109,1269 125,1225 118,1198Z',
  shinR:
    'M360,1197 470,1197 462,1222 473,1248 479,1273 478,1339 470,1386 470,1459 397,1459 392,1405 366,1330 362,1309 362,1262 373,1228 360,1198Z',
  shoeL:
    'M118,1460 192,1460 198,1476 198,1510 193,1521 193,1527 201,1542 201,1563 198,1567 99,1568 89,1563 89,1533 108,1502 117,1461Z',
  shoeR:
    'M396,1460 470,1460 482,1508 498,1533 498,1563 488,1568 391,1568 387,1563 387,1542 395,1527 395,1521 390,1511 390,1476 396,1461Z',
};

type GeoKey = keyof typeof GEO;

// One shared mannequin body path, rendered either inline (`<path d=…>`, the default — every
// figure is self-contained) or as a `<use>` reference into the sprite <UniformFigureDefs> mounts
// once (`sharedDefs`, opt-in). HelmetArtShape applies the same contract to the larger helmet art.
// Both forms paint identical pixels; <use> is a live reference, not a copy.
function Geo({
  part,
  shared,
  fill,
  stroke,
  strokeWidth,
  fillRule,
}: {
  part: GeoKey;
  shared: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fillRule?: 'nonzero' | 'evenodd';
}) {
  return shared ? (
    <use
      href={`#ufig-${part}`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fillRule={fillRule}
    />
  ) : (
    <path d={GEO[part]} fill={fill} stroke={stroke} strokeWidth={strokeWidth} fillRule={fillRule} />
  );
}

type ResolvedLayer = ResolvedUniformStyle['layers'][number];

// Each generated path stays inline for self-contained figures, or references one fixed sprite
// definition on the archive page. The per-instance transform and fill remain outside the shared
// geometry so all kits can reuse the same 51KB path set with their own surface colors.
function HelmetArtShape({
  path,
  index,
  shared,
  fill,
}: {
  path: HelmetArtPath;
  index: number;
  shared: boolean;
  fill?: string;
}) {
  const transform = `translate(${path.tx} ${path.ty})`;
  return shared ? (
    <use href={`#ufig-helmet-art-${index}`} transform={transform} fill={fill} />
  ) : (
    <path d={path.d} transform={transform} fill={fill} />
  );
}

// The silhouette and opening cutters follow the art paths' inline/shared contract, but unlike
// those relative paths they already carry absolute art-space coordinates and need no tx/ty.
function HelmetSharedPath({
  id,
  d,
  shared,
  fill,
  transform,
}: {
  id: string;
  d: string;
  shared: boolean;
  fill?: string;
  transform?: string;
}) {
  return shared ? (
    <use href={`#ufig-${id}`} fill={fill} transform={transform} />
  ) : (
    <path d={d} fill={fill} transform={transform} />
  );
}

function clipPathForSurface(surface: UniformSurface, uid: string) {
  if (surface === 'helmet') return `url(#${uid}-helmet)`;
  if (surface === 'pants') return `url(#${uid}-pants)`;
  if (surface === 'leg-left') return `url(#${uid}-legL)`;
  if (surface === 'leg-right') return `url(#${uid}-legR)`;
  return `url(#${uid}-jersey)`;
}

// Definition layers are always SVG paths; their semantic surface determines paint order and,
// when requested, which shared mannequin geometry clips them. Paint values are already resolved
// through resolveColor by resolveUniformModel.
function UniformLayerPath({ layer, uid }: { layer: ResolvedLayer; uid: string }) {
  const clipPath = layer.clip ? clipPathForSurface(layer.surface, uid) : undefined;

  return layer.kind === 'fill' ? (
    <path
      data-layer-id={layer.id}
      clipPath={clipPath}
      d={layer.d}
      fill={layer.fill}
      fillRule={layer.fillRule}
      stroke="none"
    />
  ) : (
    <path
      data-layer-id={layer.id}
      clipPath={clipPath}
      d={layer.d}
      fill="none"
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth}
      strokeLinecap={layer.lineCap}
    />
  );
}

// The sprite `<use>`-referencing figures draw from when passed `sharedDefs`. Mount this ONCE
// per page — its ids are fixed (not per-instance), so a second mount would emit duplicate DOM
// ids. Zero-size and absolutely positioned so it never affects layout.
export function UniformFigureDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {(Object.keys(GEO) as GeoKey[]).map((part) => (
          <path key={part} id={`ufig-${part}`} d={GEO[part]} />
        ))}
        {HELMET_ART.map((path, index) => (
          <path key={`helmet-art-${index}`} id={`ufig-helmet-art-${index}`} d={path.d} />
        ))}
        <path id="ufig-helmet-art-clip" d={HELMET_ART_CLIP} />
        {HELMET_ART_CUT.map((d, index) => (
          <path key={`helmet-art-cut-${index}`} id={`ufig-helmet-art-cut-${index}`} d={d} />
        ))}
      </defs>
    </svg>
  );
}

export default function UniformFigure({
  colors,
  variant = 'jersey',
  size = 34,
  imagePath,
  title,
  sharedDefs = false,
  kitId,
  definition,
}: {
  colors: JerseyColors;
  variant?: UniformArtVariant;
  size?: number;
  imagePath?: string;
  title?: string;
  // Reference <UniformFigureDefs>'s sprite via <use> instead of inlining path data — see Geo
  // above. Only pass this when the caller has mounted <UniformFigureDefs/> once on the page.
  sharedDefs?: boolean;
  // `${teamId}-${slug}-${yearStart}` (a Uniform row's id). The definition's team id and
  // start-year suffix are stripped before model resolution; omitted or unmatched kits retain
  // the team's defaults.
  kitId?: string;
  definition?: TeamUniformDefinition;
}) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const spec = variantSpec(variant);
  const [, , vbW, vbH] = spec.viewBox.split(' ').map(Number);
  const height = (size * vbH) / vbW;
  // Which mannequin groups this variant needs — e.g. 'jersey' never draws the helmet/facemask
  // (confirmed off-viewBox: transformed helmet+facemask bottom out at y≈348, the crop starts at
  // y=372) so skipping them is a pure byte-savings, not a visual change.
  const hasHelmet = spec.parts.includes('helmet');
  const hasJersey = spec.parts.includes('jersey');
  const hasPants = spec.parts.includes('pants');

  if (imagePath) {
    return <Image src={imagePath} alt={title ?? ''} width={size} height={height} />;
  }

  const kitPrefix = definition ? `${definition.teamId}-` : '';
  const rawKitSlug = kitId?.startsWith(kitPrefix) ? kitId.slice(kitPrefix.length) : (kitId ?? '');
  // Try the exact slug first so legacy ids whose geometry key itself ends in a year
  // (`rivalries-2025`) keep working. New ids add one final era year, which is stripped only
  // when the exact value is not a registered geometry key.
  const kitSlug = definition?.kits[rawKitSlug] ? rawKitSlug : rawKitSlug.replace(/-\d{4}$/, '');
  const model = resolveUniformModel(definition, kitSlug, colors);
  const pantsLayers = model.layers.filter((layer) =>
    ['pants', 'leg-left', 'leg-right'].includes(layer.surface)
  );
  const jerseyLayers = model.layers.filter((layer) =>
    ['jersey', 'sleeve-left', 'sleeve-right'].includes(layer.surface)
  );
  const collarLayers = model.layers.filter((layer) => layer.surface === 'collar');
  const numberLayers = model.layers.filter((layer) => layer.surface === 'number');
  const helmetLayers = model.layers.filter((layer) => layer.surface === 'helmet');
  const numberPath = model.number.glyphPath ?? JERSEY_NUMBER_THREE;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={spec.viewBox}
      width={size}
      height={height}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}>
      <defs>
        {hasJersey && (
          <>
            <clipPath id={`${uid}-jersey`}>
              <Geo part="jersey" shared={sharedDefs} />
            </clipPath>
            <pattern id={`${uid}-number-mesh`} width="5" height="5" patternUnits="userSpaceOnUse">
              <circle cx="2.5" cy="2.5" r="0.55" fill={model.jerseyColor} opacity="0.22" />
            </pattern>
          </>
        )}
        {hasHelmet && (
          <>
            <clipPath id={`${uid}-helmet`}>
              {/* Keep the registration on the shape: librsvg misclips decals when a transformed
                  group is nested inside clipPath, while path/use transforms paint identically. */}
              <HelmetSharedPath
                id="helmet-art-clip"
                d={HELMET_ART_CLIP}
                shared={sharedDefs}
                transform={HELMET_ART_TRANSFORM}
              />
            </clipPath>
            <mask
              id={`${uid}-helmet-openings`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1720"
              height="1440">
              <rect x="0" y="0" width="1720" height="1440" fill="white" />
              {HELMET_ART_CUT.map((d, index) => (
                <HelmetSharedPath
                  key={index}
                  id={`helmet-art-cut-${index}`}
                  d={d}
                  shared={sharedDefs}
                  fill="#000000"
                />
              ))}
            </mask>
          </>
        )}
        {hasPants && (
          <>
            <clipPath id={`${uid}-pants`}>
              <Geo part="pants" shared={sharedDefs} />
            </clipPath>
            <clipPath id={`${uid}-legL`}>
              <Geo part="pants" shared={sharedDefs} />
              <Geo part="shinL" shared={sharedDefs} />
            </clipPath>
            <clipPath id={`${uid}-legR`}>
              <Geo part="pants" shared={sharedDefs} />
              <Geo part="shinR" shared={sharedDefs} />
            </clipPath>
          </>
        )}
      </defs>
      <g stroke={OUTLINE} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
        {hasPants && (
          <>
            <Geo part="pants" shared={sharedDefs} fill={model.pantsColor} />
            <Geo part="shinL" shared={sharedDefs} fill={model.pantsColor} />
            <Geo part="shinR" shared={sharedDefs} fill={model.pantsColor} />
            {pantsLayers.map((layer) => (
              <UniformLayerPath key={layer.id} layer={layer} uid={uid} />
            ))}
            <Geo part="shoeL" shared={sharedDefs} fill="#ffffff" />
            <Geo part="shoeR" shared={sharedDefs} fill="#ffffff" />
          </>
        )}
        {hasJersey && (
          <g>
            <Geo part="jersey" shared={sharedDefs} fill={model.jerseyColor} />
            {jerseyLayers.map((layer) => (
              <UniformLayerPath key={layer.id} layer={layer} uid={uid} />
            ))}
            {collarLayers.map((layer) => (
              <UniformLayerPath key={layer.id} layer={layer} uid={uid} />
            ))}
            {numberLayers.map((layer) => (
              <UniformLayerPath key={layer.id} layer={layer} uid={uid} />
            ))}
            <g data-number="3">
              <path
                clipPath={`url(#${uid}-jersey)`}
                d={numberPath}
                fill="none"
                stroke={model.number.outline}
                strokeWidth={model.number.outlineWidth}
                strokeLinejoin="miter"
              />
              <path
                clipPath={`url(#${uid}-jersey)`}
                d={numberPath}
                fill={model.number.fill}
                stroke="none"
              />
              {!model.number.glyphPath && (
                <path
                  clipPath={`url(#${uid}-jersey)`}
                  d={numberPath}
                  fill={`url(#${uid}-number-mesh)`}
                  stroke="none"
                />
              )}
            </g>
          </g>
        )}
        {hasHelmet && (
          <g transform="translate(80.25 11) scale(0.5)">
            <g transform={HELMET_ART_TRANSFORM}>
              <g data-helmet-art="base" mask={`url(#${uid}-helmet-openings)`} stroke="none">
                {HELMET_ART.map((path, index) => (
                  <HelmetArtShape
                    key={index}
                    path={path}
                    index={index}
                    shared={sharedDefs}
                    fill={
                      path.role === 'hardware'
                        ? path.fill
                        : shadeFor(
                            path.role === 'shell' ? model.helmetColor : model.facemaskColor,
                            path.dl ?? 0
                          )
                    }
                  />
                ))}
              </g>
            </g>
            {helmetLayers.map((layer) => (
              <UniformLayerPath key={layer.id} layer={layer} uid={uid} />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
