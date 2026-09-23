import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  extractComments,
  findForbiddenCommentReferences,
  parseChangedLineRanges,
} from '../lib/public-comments';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const args = process.argv.slice(2);
const allFiles = args.includes('--all');
const changedSinceIndex = args.indexOf('--changed-since');
const changedSince = changedSinceIndex === -1 ? null : args[changedSinceIndex + 1];

if (!allFiles && !changedSince) {
  console.error('Usage: check-public-comments.mts --all | --changed-since <git-ref>');
  process.exit(2);
}

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
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.py',
  '.sh',
  '.sql',
  '.swift',
  '.toml',
  '.ts',
  '.tsx',
  '.xcconfig',
  '.yaml',
  '.yml',
]);

function isSourceFile(filename: string): boolean {
  if (!sourceRoots.some((prefix) => filename.startsWith(prefix))) return filename === 'project.yml';
  if (filename.includes('/node_modules/') || filename.includes('/.next/')) return false;
  if (filename.endsWith('package-lock.json')) return false;
  return (
    sourceExtensions.has(path.extname(filename).toLowerCase()) || filename.startsWith('.githooks/')
  );
}

function changedRanges(ref: string) {
  const diff = execFileSync('git', ['diff', '--unified=0', '--no-color', ref, '--'], {
    cwd: root,
    encoding: 'utf8',
  });
  return parseChangedLineRanges(diff);
}

function overlapsChangedLines(
  line: number,
  endLine: number,
  ranges: Array<[number, number]> | undefined
): boolean {
  return ranges?.some(([start, end]) => line <= end && endLine >= start) ?? false;
}

const ranges = changedSince ? changedRanges(changedSince) : null;
const findings: string[] = [];

for (const filename of trackedFiles.filter(isSourceFile)) {
  if (ranges && !ranges.has(filename)) continue;

  const absolutePath = path.join(root, filename);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const comments = extractComments(source, filename);
  const forbidden = findForbiddenCommentReferences(comments).filter((finding) =>
    ranges ? overlapsChangedLines(finding.line, finding.endLine, ranges.get(filename)) : true
  );

  for (const finding of forbidden) {
    findings.push(`${filename}:${finding.line} ${finding.pattern} (${finding.match})`);
  }
}

if (findings.length > 0) {
  console.error('Prohibited internal references found in changed source comments:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('Public source comment policy passed.');
