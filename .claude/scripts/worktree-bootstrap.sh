#!/usr/bin/env bash
# Role: make a fresh git worktree immediately usable by an agent.
#
# Constraint this satisfies: node_modules/ and .env.local are gitignored, so `git
# worktree add` produces a tree where `npm test`, `npm run format`, and the
# PreToolUse typecheck hook all fail on "command not found". This runs on
# SessionStart, is idempotent, and costs ~0ms once the worktree is warm.
#
# node_modules is always cloned with `cp -c` (APFS clonefile): copy-on-write, so
# it is seconds instead of an install, and costs ~4MB of real disk rather than
# another ~550MB. Measured: a from-scratch `npm ci` consumes ~563MB of actual
# free space; clone-then-reconcile consumes ~11MB for the same tree.
#
# When package-lock.json differs from the main checkout's, the clone is stale for
# this branch, so `npm install` reconciles it IN PLACE — pruning and adding only
# what the branch actually changed, leaving every untouched package still sharing
# blocks with the main checkout. `npm ci` is not used for this: it wipes
# node_modules first, which discards the sharing and re-extracts ~550MB.
#
# .env.local is symlinked, never copied — one copy of the secrets, on disk once.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0

# A worktree's .git is a file ("gitdir: ..."); the main checkout's is a directory.
[ -f .git ] || exit 0

main_dir=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')
[ -n "${main_dir:-}" ] && [ -d "$main_dir" ] || exit 0
[ "$main_dir" = "$PWD" ] && exit 0

lock_hash() { shasum package-lock.json 2>/dev/null | cut -d' ' -f1; }

if [ ! -e node_modules ]; then
  if [ -d "$main_dir/node_modules" ]; then
    echo "worktree-bootstrap: cloning node_modules from $main_dir (APFS copy-on-write)" >&2
    cp -Rc "$main_dir/node_modules" node_modules 2>/dev/null || cp -R "$main_dir/node_modules" node_modules

    if ! cmp -s package-lock.json "$main_dir/package-lock.json"; then
      echo "worktree-bootstrap: package-lock differs — reconciling the clone in place" >&2
      # Only a lockfile that is currently clean may be restored below; if the
      # branch has genuine uncommitted lockfile edits, they are the user's.
      lock_was_clean=no
      git diff --quiet -- package-lock.json 2>/dev/null && lock_was_clean=yes
      lock_before=$(lock_hash)

      if ! npm install --silent --no-audit --no-fund; then
        echo "worktree-bootstrap: npm install failed — falling back to npm ci" >&2
        npm ci --silent || echo "worktree-bootstrap: npm ci failed too; tree may be incomplete" >&2
      fi

      # `npm install` rewrites package-lock.json whenever package.json disagrees
      # with it. A bootstrap hook must never leave a tracked file quietly dirty,
      # so put it back and say so — the disagreement is the branch's to fix (and
      # is the same state that would make `npm ci` fail outright).
      if [ "$lock_was_clean" = yes ] && [ "$(lock_hash)" != "$lock_before" ]; then
        git checkout -- package-lock.json 2>/dev/null &&
          echo "worktree-bootstrap: WARNING package.json and package-lock.json disagree on this branch; npm rewrote the lockfile and it has been restored to the committed version" >&2
      fi
    fi
  else
    echo "worktree-bootstrap: no node_modules in $main_dir — running npm ci" >&2
    npm ci --silent
  fi
fi

if [ ! -e .env.local ] && [ -f "$main_dir/.env.local" ]; then
  echo "worktree-bootstrap: linking .env.local from $main_dir" >&2
  ln -s "$main_dir/.env.local" .env.local
fi

exit 0
