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
const excludedExtensions = new Set(['.css', '.html', '.plist', '.svg', '.xml']);

const forbiddenPatterns: Array<[string, RegExp]> = [
  ['ticket id', /\b(?:DEP|OB|SYM|AO|LLM|SCP)-\d+\b/i],
  [
    'private documentation path',
    /(?:\.\.?\/)*obsidian\/Projects|Projects\/(?:depth|agent-ops|obsidian)\/(?:specs|Tickets|Reference)|\bthe vault\b/i,
  ],
  [
    'agent policy reference',
    /\b(?:AGENTS|CLAUDE)\.md\b|web\/CLAUDE\.md|\b(?:agent-ready|capture-ticket|scope-ticket)\b/i,
  ],
  [
    'private decision provenance',
    /\b(?:per Cooper|Cooper's|Greptile|Claude Design|NN\/G|Astra review|Luna review)\b/i,
  ],
  [
    'temporary planning history',
    /\b(?:locked decision|design spec|auth pass|share pass|backlog|roadmap|THROWAWAY PROTOTYPE|not landed|review demo account|App Review demo account)\b/i,
  ],
];

function lineNumberAt(source: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source[cursor] === '\n') line += 1;
  }
  return line;
}

function lineCommentTokens(filename: string): string[] {
  const extension = path.extname(filename).toLowerCase();
  if (excludedExtensions.has(extension)) return [];
  if (hashCommentExtensions.has(extension)) return ['#'];
  if (sqlExtensions.has(extension)) return ['--', '//'];
  return ['//'];
}

function isQuote(character: string): boolean {
  return character === "'" || character === '"' || character === '`';
}

export function extractComments(source: string, filename: string): SourceComment[] {
  const comments: SourceComment[] = [];
  const tokens = lineCommentTokens(filename);
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

    if (isQuote(character)) {
      quote = character;
      index += 1;
      continue;
    }

    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      const endIndex = end === -1 ? source.length : end + 2;
      comments.push({
        line: lineNumberAt(source, index),
        endLine: lineNumberAt(source, endIndex),
        text: source.slice(index + 2, end === -1 ? source.length : end),
      });
      index = endIndex;
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
  comments: SourceComment[]
): ForbiddenCommentReference[] {
  return comments.flatMap((comment) =>
    forbiddenPatterns.flatMap(([pattern, expression]) => {
      const match = comment.text.match(expression);
      return match
        ? [{ line: comment.line, endLine: comment.endLine, pattern, match: match[0] }]
        : [];
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
