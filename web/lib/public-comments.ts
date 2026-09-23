import path from 'node:path';

export type SourceComment = {
  line: number;
  endLine: number;
  text: string;
};

export type ForbiddenCommentReference = {
  line: number;
  endLine: number;
  pattern: string;
  match: string;
};

export type ChangedLineRanges = Map<string, Array<[number, number]>>;

const hashCommentExtensions = new Set(['.py', '.sh', '.bash', '.zsh', '.toml', '.yml', '.yaml']);
const sqlExtensions = new Set(['.sql']);
const markupExtensions = new Set(['.html', '.plist', '.svg', '.xml']);

const forbiddenPatterns: Array<[string, RegExp]> = [
  ['ticket id', /\b(?:DEP|OB|SYM|AO|LLM|SCP)-\d+\b/i],
  [
    'private documentation path',
    /(?:\.\.?\/)*obsidian\/Projects|Projects\/(?:depth|agent-ops|obsidian)\/|\bobsidian\b|\bDecisions\.md\b|\bthe vault\b/i,
  ],
  [
    'agent policy reference',
    /\b(?:AGENTS|CLAUDE)\.md\b|web\/CLAUDE\.md|\b(?:agent-ready|capture-ticket|scope-ticket)\b/i,
  ],
  ['private decision provenance', /\b(?:Cooper|Greptile|Claude Design|NN\/G)\b/i],
  [
    'model or agent name',
    /\b(?:Astra|Luna|Codex|ChatGPT|GPT-\d[\w.]*|Gemini|Sonnet|Opus|Haiku|Copilot)\b|\bClaude\b(?! Code)/,
  ],
  [
    'legal or sourcing stance',
    /\b(?:third-party mark|fair[- ]use|nominative|non-free|licen[cs](?:e|es|ed|ing)|copyright\w*|trademark\w*|public domain|legal (?:posture|stance|audit)|(?:not|never) traced|trace-then-stylize)\b/i,
  ],
  [
    'temporary planning history',
    /\b(?:locked decision|design spec|auth pass|share pass|backlog|roadmap|THROWAWAY PROTOTYPE|not landed|review demo account|App Review demo account)\b/i,
  ],
];

// Markdown is checked line by line. Agent instruction files name each other by design, and the
// attributions file is the one document allowed to carry third-party notices.
const markdownExemptions: Record<string, ReadonlySet<string>> = {
  '*': new Set(['agent policy reference']),
  'ATTRIBUTIONS.md': new Set(['agent policy reference', 'legal or sourcing stance']),
};

// Private and machine-specific paths are rejected anywhere in a source file, not just in
// comments, so a string literal cannot carry one either.
const pathsInSource: Array<[string, RegExp]> = [
  ['private documentation path', /\bobsidian[:/]|Projects\/depth\//i],
  ['personal path', /\/Users\/[^/\s'"`]+\//],
];

function lineNumberAt(source: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source[cursor] === '\n') line += 1;
  }
  return line;
}

export function isMarkdown(filename: string): boolean {
  return path.extname(filename).toLowerCase() === '.md';
}

function blockDelimiters(filename: string): Array<[string, string]> {
  const extension = path.extname(filename).toLowerCase();
  if (markupExtensions.has(extension)) return [['<!--', '-->']];
  // Python triple-quoted strings are docstrings or emitted text, and both are public prose.
  if (extension === '.py') {
    return [
      ['"""', '"""'],
      ["'''", "'''"],
    ];
  }
  return [['/*', '*/']];
}

function lineCommentTokens(filename: string): string[] {
  const extension = path.extname(filename).toLowerCase();
  if (markupExtensions.has(extension) || extension === '.css') return [];
  if (hashCommentExtensions.has(extension)) return ['#'];
  if (sqlExtensions.has(extension)) return ['--', '//'];
  return ['//'];
}

function isQuote(character: string): boolean {
  return character === "'" || character === '"' || character === '`';
}

export function extractComments(source: string, filename: string): SourceComment[] {
  if (isMarkdown(filename)) {
    return source.split('\n').map((text, index) => ({ line: index + 1, endLine: index + 1, text }));
  }
  const comments: SourceComment[] = [];
  const tokens = lineCommentTokens(filename);
  const blocks = blockDelimiters(filename);
  const tracksQuotes = !markupExtensions.has(path.extname(filename).toLowerCase());
  let quote: string | null = null;
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    if (quote) {
      if (character === '\\') {
        index += 2;
        continue;
      }
      if (character === quote) quote = null;
      index += 1;
      continue;
    }

    const block = blocks.find(([open]) => source.startsWith(open, index));
    if (block) {
      const [open, close] = block;
      const end = source.indexOf(close, index + open.length);
      const endIndex = end === -1 ? source.length : end + close.length;
      comments.push({
        line: lineNumberAt(source, index),
        endLine: lineNumberAt(source, endIndex),
        text: source.slice(index + open.length, end === -1 ? source.length : end),
      });
      index = endIndex;
      continue;
    }

    if (tracksQuotes && isQuote(character)) {
      quote = character;
      index += 1;
      continue;
    }

    const token = tokens.find((candidate) => source.startsWith(candidate, index));
    if (token) {
      const end = source.indexOf('\n', index + token.length);
      comments.push({
        line: lineNumberAt(source, index),
        endLine: lineNumberAt(source, end === -1 ? source.length : end),
        text: source.slice(index + token.length, end === -1 ? source.length : end),
      });
      index = end === -1 ? source.length : end;
      continue;
    }

    index += 1;
  }

  return comments;
}

export function findForbiddenCommentReferences(
  comments: SourceComment[],
  filename = ''
): ForbiddenCommentReference[] {
  const exempt = isMarkdown(filename)
    ? new Set([...markdownExemptions['*'], ...(markdownExemptions[path.basename(filename)] ?? [])])
    : new Set<string>();
  return comments.flatMap((comment) =>
    forbiddenPatterns.flatMap(([pattern, expression]) => {
      if (exempt.has(pattern)) return [];
      const match = comment.text.match(expression);
      return match
        ? [{ line: comment.line, endLine: comment.endLine, pattern, match: match[0] }]
        : [];
    })
  );
}

export function findPrivatePathsInSource(source: string): ForbiddenCommentReference[] {
  return source.split('\n').flatMap((text, index) =>
    pathsInSource.flatMap(([pattern, expression]) => {
      const match = text.match(expression);
      return match ? [{ line: index + 1, endLine: index + 1, pattern, match: match[0] }] : [];
    })
  );
}

export function parseChangedLineRanges(diff: string): ChangedLineRanges {
  const ranges: ChangedLineRanges = new Map();
  let filename: string | null = null;

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      filename = line.slice('+++ b/'.length);
      if (!ranges.has(filename)) ranges.set(filename, []);
      continue;
    }

    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!filename || !hunk) continue;

    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    if (count > 0) ranges.get(filename)?.push([start, start + count - 1]);
  }

  return ranges;
}
