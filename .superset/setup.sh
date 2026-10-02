#!/usr/bin/env bash
# Prepares a fresh worktree: copies untracked env files from the root checkout and regenerates
# the Xcode project from project.yml.
set -euo pipefail

ROOT="${SUPERSET_ROOT_PATH:?SUPERSET_ROOT_PATH is not set}"
WORKSPACE="${SUPERSET_WORKSPACE_PATH:-$PWD}"

if [ "$ROOT" != "$WORKSPACE" ]; then
  for f in .env.braintrust; do
    if [ -f "$ROOT/$f" ] && [ ! -e "$WORKSPACE/$f" ]; then
      cp "$ROOT/$f" "$WORKSPACE/$f"
      echo "copied $f"
    fi
  done
fi

cd "$WORKSPACE"
xcodegen generate
