// The Logo + "depth" wordmark gap, shared by components/DepthMark.tsx (a client component) and
// app/signin/page.tsx (a server component that hand-rolls the same mark at a larger size). Kept
// in a plain module rather than exported from DepthMark.tsx itself: a 'use client' file's
// non-component exports can't be read directly by a server component — Next.js replaces them
// with a client-reference stub that throws when the server tries to use the value (this broke
// /signin entirely until the constant moved here).
export const MARK_WORDMARK_GAP = 'gap-1';
