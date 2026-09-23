import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  extractComments,
  findForbiddenCommentReferences,
  findPrivatePathsInSource,
  isMarkdown,
  parseChangedLineRanges,
  parsePrivateRules,
  type PrivateRule,
} from '../lib/public-comments';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const args = process.argv.slice(2);
const allFiles = args.includes('--all');
const staged = args.includes('--staged');
const changedSinceIndex = args.indexOf('--changed-since');
const changedSince = changedSinceIndex === -1 ? null : args[changedSinceIndex + 1];

if (!allFiles && !staged && !changedSince) {
  console.error('Usage: check-public-comments.mts --all | --staged | --changed-since <git-ref>');
  process.exit(2);
}

// CI logs are public, so a private-rule finding there names neither the rule nor the match.
const redactPrivate = Boolean(process.env.CI);
const defaultDenylistFile = path.join(
  os.homedir(),
  '.config',
  'depth',
  'public-comment-denylist.json'
);

// Sensitive terms are supplied at runtime and never committed: PUBLIC_COMMENT_DENYLIST holds the
// JSON itself (CI secret), PUBLIC_COMMENT_DENYLIST_FILE or the default file holds it locally.
function loadPrivateRules(): PrivateRule[] {
  const inline = process.env.PUBLIC_COMMENT_DENYLIST;
  if (inline) return parsePrivateRules(inline);
  const file = process.env.PUBLIC_COMMENT_DENYLIST_FILE ?? defaultDenylistFile;
  if (fs.existsSync(file)) return parsePrivateRules(fs.readFileSync(file, 'utf8'));
  const notice = 'No private denylist found; checking the public rules only.';
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${notice}` : notice);
  return [];
}

const privateRules = loadPrivateRules();

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);

const sourceRoots = [
  'Depth/',
  'DepthTests/',
  'DepthUITests/',
  'web/',
  '.github/',
  'scripts/',
  'xcconfig/',
  '.githooks/',
];
const sourceExtensions = new Set([
  '.bash',
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.plist',
  '.py',
  '.sh',
  '.sql',
  '.svg',
  '.swift',
  '.toml',
  '.ts',
  '.tsx',
  '.xcconfig',
  '.xml',
  '.yaml',
  '.yml',
]);

// Vendored and project agent skills are tooling that ships its own prose; every other tracked
// Markdown document is public project documentation and is held to the same rules as comments.
const markdownExcludedRoots = ['.agents/', '.claude/'];
// Applied migrations are immutable history; the full scan skips them, while a changed-line
// scan still covers any new migration.
const fullScanExcludedRoots = ['web/supabase/migrations/'];
// The checker's own tests necessarily contain the strings it rejects.
const selfTestFiles = new Set(['web/lib/__tests__/public-comments.test.ts']);

function isMarkdownDocument(filename: string): boolean {
  if (!isMarkdown(filename)) return false;
  if (markdownExcludedRoots.some((prefix) => filename.startsWith(prefix))) return false;
  return !filename.includes('/node_modules/');
}

function isSourceFile(filename: string): boolean {
  if (selfTestFiles.has(filename)) return false;
  if (isMarkdownDocument(filename)) return true;
  if (!sourceRoots.some((prefix) => filename.startsWith(prefix))) return filename === 'project.yml';
  if (filename.includes('/node_modules/') || filename.includes('/.next/')) return false;
  if (filename.endsWith('package-lock.json')) return false;
  return (
    sourceExtensions.has(path.extname(filename).toLowerCase()) || filename.startsWith('.githooks/')
  );
}

function changedRanges(diffArgs: string[]) {
  const diff = execFileSync('git', ['diff', '--unified=0', '--no-color', ...diffArgs, '--'], {
    cwd: root,
    encoding: 'utf8',
  });
  return parseChangedLineRanges(diff);
}

// A staged check reads the index, so a partially staged file is judged by what will be committed.
function readSource(filename: string): string {
  if (staged) {
    return execFileSync('git', ['show', `:${filename}`], { cwd: root, encoding: 'utf8' });
  }
  return fs.readFileSync(path.join(root, filename), 'utf8');
}

function overlapsChangedLines(
  line: number,
  endLine: number,
  ranges: Array<[number, number]> | undefined
): boolean {
  return ranges?.some(([start, end]) => line <= end && endLine >= start) ?? false;
}

const ranges = staged
  ? changedRanges(['--cached'])
  : changedSince
    ? changedRanges([changedSince])
    : null;
const findings: string[] = [];

for (const filename of trackedFiles.filter(isSourceFile)) {
  if (ranges && !ranges.has(filename)) continue;
  if (!ranges && fullScanExcludedRoots.some((prefix) => filename.startsWith(prefix))) continue;

  const absolutePath = path.join(root, filename);
  // A symlinked document is checked once, through its target; a staged deletion has no file.
  if (!fs.existsSync(absolutePath) || fs.lstatSync(absolutePath).isSymbolicLink()) continue;
  const source = readSource(filename);
  const comments = extractComments(source, filename);
  const references = [
    ...findForbiddenCommentReferences(comments, filename, privateRules),
    ...(isMarkdown(filename) ? [] : findPrivatePathsInSource(source)),
  ];
  const forbidden = references.filter((finding) =>
    ranges ? overlapsChangedLines(finding.line, finding.endLine, ranges.get(filename)) : true
  );

  for (const finding of forbidden) {
    const detail =
      finding.private && redactPrivate ? 'private term' : `${finding.pattern} (${finding.match})`;
    findings.push(`${filename}:${finding.line} ${detail}`);
  }
}

if (findings.length > 0) {
  console.error('Prohibited internal references found in public source:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('Public source comment policy passed.');
