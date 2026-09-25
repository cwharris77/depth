// Builds a deterministic, self-contained HTML review sheet for one team's uniform rows.
// Pure string building: no DOM, no external assets. Every image arrives as a data: URI
// already, so the page opens standalone (file://) with no network fetches.

export interface ImageRef {
  src: string; // data: URI
  alt: string;
}

export interface ReviewDesign {
  rowId: string;
  name: string;
  reference?: ImageRef;
  before?: ImageRef; // committed raster at the base ref; absent for a new design
  after: ImageRef;
  combinations: Array<{ label: string; image: ImageRef }>;
}

export interface ReviewNotes {
  crops: Record<string, { file: string; box: [number, number, number, number] }>;
  missing: Array<{
    design?: string;
    surface: string;
    detail: string;
    resolution: 'added' | 'dismissed' | 'open';
    note?: string;
  }>;
  absentMarks: Array<{ design?: string; mark: string; note?: string }>;
}

export interface ReviewSheetInput {
  teamName: string; // "Seahawks"
  baseRef: string; // shown in the header: "before = <baseRef>"
  designs: ReviewDesign[];
  references: ImageRef[]; // every team reference image, shown full-size under the designs
  notes: ReviewNotes;
  needsSource: Array<{ rowId: string; from: number; to: number }>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function figure(caption: string, image: ImageRef | undefined, placeholder: string): string {
  const body = image
    ? `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" />`
    : `<p class="placeholder">${escapeHtml(placeholder)}</p>`;
  return `<figure>${body}<figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}

function designSection(design: ReviewDesign): string {
  const combinationsBody =
    design.combinations.length > 0
      ? design.combinations
          .map((combination) => figure(combination.label, combination.image, ''))
          .join('')
      : `<p class="placeholder">No extra combinations</p>`;
  return `<section class="design">
  <h2>${escapeHtml(design.name)} <span class="row-id">${escapeHtml(design.rowId)}</span></h2>
  <div class="figure-grid">
    ${figure('Reference', design.reference, 'No reference crop')}
    ${figure('Before', design.before, 'New design')}
    ${figure('After', design.after, '')}
    <div class="combinations">${combinationsBody}<span class="combinations-caption">Combinations</span></div>
  </div>
</section>`;
}

const RESOLUTION_ORDER: Record<ReviewNotes['missing'][number]['resolution'], number> = {
  open: 0,
  added: 1,
  dismissed: 2,
};

function missingTable(missing: ReviewNotes['missing']): string {
  if (missing.length === 0) return '<p>None</p>';
  const rows = [...missing]
    .sort((a, b) => RESOLUTION_ORDER[a.resolution] - RESOLUTION_ORDER[b.resolution])
    .map(
      (entry) => `<tr>
        <td>${escapeHtml(entry.design ?? '')}</td>
        <td>${escapeHtml(entry.surface)}</td>
        <td>${escapeHtml(entry.detail)}</td>
        <td>${escapeHtml(entry.resolution)}</td>
        <td>${escapeHtml(entry.note ?? '')}</td>
      </tr>`
    )
    .join('');
  return `<table>
    <thead><tr><th>Design</th><th>Surface</th><th>Detail</th><th>Resolution</th><th>Note</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function needsSourceList(needsSource: ReviewSheetInput['needsSource']): string {
  if (needsSource.length === 0) return '<p>None</p>';
  const items = needsSource
    .map(
      (entry) =>
        `<li>${escapeHtml(entry.rowId)}: ${escapeHtml(String(entry.from))}–${escapeHtml(String(entry.to))}</li>`
    )
    .join('');
  return `<ul>${items}</ul>`;
}

function absentMarksList(absentMarks: ReviewNotes['absentMarks']): string {
  if (absentMarks.length === 0) return '<p>None</p>';
  const items = absentMarks
    .map((entry) => {
      const design = entry.design ? `${escapeHtml(entry.design)}: ` : '';
      const note = entry.note ? ` — ${escapeHtml(entry.note)}` : '';
      return `<li>${design}${escapeHtml(entry.mark)}${note}</li>`;
    })
    .join('');
  return `<ul>${items}</ul>`;
}

function referencesSection(references: ImageRef[]): string {
  if (references.length === 0) return '<p>None</p>';
  return references.map((ref) => figure(ref.alt, ref, '')).join('');
}

const STYLE = `
  :root {
    --bg: #f7f7f8;
    --fg: #1a1a1a;
    --muted: #666666;
    --line: #d8d8dc;
    --panel: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
      --bg: #16171a;
      --fg: #ececec;
      --muted: #9a9a9a;
      --line: #33343a;
      --panel: #202126;
    }
  }
  :root[data-theme='dark'] {
    --bg: #16171a;
    --fg: #ececec;
    --muted: #9a9a9a;
    --line: #33343a;
    --panel: #202126;
  }
  * { box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    margin: 0;
    padding: 24px 16px;
    max-width: 100%;
    overflow-x: hidden;
  }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  h2 { font-size: 1.1rem; margin: 0 0 12px; }
  .base-ref { color: var(--muted); margin-top: 0; }
  section.design {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
  }
  .row-id { color: var(--muted); font-weight: normal; font-size: 0.85rem; }
  .figure-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  @media (max-width: 700px) {
    .figure-grid { grid-template-columns: repeat(2, 1fr); }
  }
  figure {
    margin: 0;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px;
    background: var(--bg);
  }
  figure img { max-width: 100%; display: block; margin: 0 auto; }
  figcaption, .combinations-caption { color: var(--muted); font-size: 0.8rem; margin-top: 6px; text-align: center; }
  .placeholder { color: var(--muted); font-style: italic; text-align: center; }
  .combinations { display: flex; flex-direction: column; gap: 8px; }
  .combinations-caption { display: block; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid var(--line); padding: 6px 8px; text-align: left; font-size: 0.9rem; }
  ul { padding-left: 20px; }
`;

// Pure string builder: no DOM, no external assets, so the page opens standalone.
export function buildReviewSheet(input: ReviewSheetInput): string {
  const designs = input.designs.map(designSection).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.teamName)} review</title>
<style>${STYLE}</style>
</head>
<body>
<h1>${escapeHtml(input.teamName)} uniform review</h1>
<p class="base-ref">before = ${escapeHtml(input.baseRef)}</p>
${designs}
<h2>Missing details</h2>
${missingTable(input.notes.missing)}
<h2>Needs source</h2>
${needsSourceList(input.needsSource)}
<h2>Absent marks</h2>
${absentMarksList(input.notes.absentMarks)}
<h2>References</h2>
${referencesSection(input.references)}
</body>
</html>
`;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseBox(value: unknown, path: string): [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(isFiniteNonNegative)) {
    throw new Error(`${path}: box must be four non-negative numbers`);
  }
  const [left, top, width, height] = value;
  if (width <= 0 || height <= 0) {
    throw new Error(`${path}: box width and height must be greater than 0`);
  }
  return [left, top, width, height];
}

// A crop file is a plain filename inside the team's refs directory, never a path that could
// escape it.
const UNSAFE_FILE = /[/\\]|\.\./;

const RESOLUTIONS = new Set(['added', 'dismissed', 'open']);

// Validates the private review.json shape. Every field is optional; unknown shapes throw with
// the offending index so a malformed entry is easy to find.
export function parseReviewNotes(json: unknown): ReviewNotes {
  const raw = (json ?? {}) as Record<string, unknown>;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('review.json: expected an object');
  }

  const crops: ReviewNotes['crops'] = {};
  const rawCrops = raw.crops;
  if (rawCrops !== undefined) {
    if (typeof rawCrops !== 'object' || rawCrops === null) {
      throw new Error('crops: expected an object');
    }
    for (const [rowId, entry] of Object.entries(rawCrops as Record<string, unknown>)) {
      if (typeof entry !== 'object' || entry === null) {
        throw new Error(`crops.${rowId}: expected an object`);
      }
      const { file, box } = entry as Record<string, unknown>;
      if (typeof file !== 'string' || file.length === 0 || UNSAFE_FILE.test(file)) {
        throw new Error(`crops.${rowId}: file must be a plain filename, no "/", "\\" or ".."`);
      }
      crops[rowId] = { file, box: parseBox(box, `crops.${rowId}`) };
    }
  }

  const missing: ReviewNotes['missing'] = [];
  const rawMissing = raw.missing;
  if (rawMissing !== undefined) {
    if (!Array.isArray(rawMissing)) throw new Error('missing: expected an array');
    rawMissing.forEach((entry, index) => {
      const path = `missing[${index}]`;
      if (typeof entry !== 'object' || entry === null) {
        throw new Error(`${path}: expected an object`);
      }
      const { design, surface, detail, resolution, note } = entry as Record<string, unknown>;
      if (typeof surface !== 'string' || surface.length === 0) {
        throw new Error(`${path}: surface must be a non-empty string`);
      }
      if (typeof detail !== 'string' || detail.length === 0) {
        throw new Error(`${path}: detail must be a non-empty string`);
      }
      if (typeof resolution !== 'string' || !RESOLUTIONS.has(resolution)) {
        throw new Error(`${path}: resolution must be one of added, dismissed, open`);
      }
      if (design !== undefined && typeof design !== 'string') {
        throw new Error(`${path}: design must be a string`);
      }
      if (note !== undefined && typeof note !== 'string') {
        throw new Error(`${path}: note must be a string`);
      }
      missing.push({
        ...(design !== undefined ? { design } : {}),
        surface,
        detail,
        resolution: resolution as ReviewNotes['missing'][number]['resolution'],
        ...(note !== undefined ? { note } : {}),
      });
    });
  }

  const absentMarks: ReviewNotes['absentMarks'] = [];
  const rawAbsentMarks = raw.absentMarks;
  if (rawAbsentMarks !== undefined) {
    if (!Array.isArray(rawAbsentMarks)) throw new Error('absentMarks: expected an array');
    rawAbsentMarks.forEach((entry, index) => {
      const path = `absentMarks[${index}]`;
      if (typeof entry !== 'object' || entry === null) {
        throw new Error(`${path}: expected an object`);
      }
      const { design, mark, note } = entry as Record<string, unknown>;
      if (typeof mark !== 'string' || mark.length === 0) {
        throw new Error(`${path}: mark must be a non-empty string`);
      }
      if (design !== undefined && typeof design !== 'string') {
        throw new Error(`${path}: design must be a string`);
      }
      if (note !== undefined && typeof note !== 'string') {
        throw new Error(`${path}: note must be a string`);
      }
      absentMarks.push({
        ...(design !== undefined ? { design } : {}),
        mark,
        ...(note !== undefined ? { note } : {}),
      });
    });
  }

  return { crops, missing, absentMarks };
}
