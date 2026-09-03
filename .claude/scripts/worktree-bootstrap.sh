#!/usr/bin/env bash
# Role: make a fresh git worktree immediately usable by an agent.
#
# Constraint this satisfies: node_modules/ and .env.local are gitignored, so `git
# worktree add` produces a tree where `npm test`, `npm run format`, and the
# PreToolUse typecheck hook all fail on "command not found". This runs on
# SessionStart, is idempotent, and costs ~0ms once the worktree is warm.
#
# node_modules is cloned with `cp -c` (APFS clonefile): copy-on-write, so it is
# seconds instead of an `npm ci`, and shares disk blocks with the main checkout
# instead of costing another ~550MB. If package-lock.json differs from the main
# checkout's, the clone is wrong for this branch and we `npm ci` instead.
# .env.local is symlinked, never copied — one copy of the secrets, on disk once.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0

# A worktree's .git is a file ("gitdir: ..."); the main checkout's is a directory.
[ -f .git ] || exit 0

main_dir=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')
[ -n "${main_dir:-}" ] && [ -d "$main_dir" ] || exit 0
[ "$main_dir" = "$PWD" ] && exit 0

if [ ! -e node_modules ]; then
  if [ -d "$main_dir/node_modules" ] && cmp -s package-lock.json "$main_dir/package-lock.json"; then
    echo "worktree-bootstrap: cloning node_modules from $main_dir (APFS copy-on-write)" >&2
    cp -Rc "$main_dir/node_modules" node_modules 2>/dev/null || cp -R "$main_dir/node_modules" node_modules
  else
    echo "worktree-bootstrap: package-lock differs (or no source tree) — running npm ci" >&2
    npm ci --silent
  fi
fi

if [ ! -e .env.local ] && [ -f "$main_dir/.env.local" ]; then
  echo "worktree-bootstrap: linking .env.local from $main_dir" >&2
  ln -s "$main_dir/.env.local" .env.local
fi

exit 0
