#!/usr/bin/env bash
# Vercel ignoreCommand: skip builds whose only changes are internal docs/logs.
#
# Vercel's convention: exit 1 = continue the build, exit 0 = skip it
# (docs/project-configuration/project-settings#ignored-build-step). `git diff
# --quiet` already exits 0 when the compared paths show no differences and 1
# when they do, so diffing everything EXCEPT the ignored paths and passing its
# exit code straight through lines up with Vercel's convention with no
# inversion needed.
#
# VERCEL_GIT_PREVIOUS_SHA is empty on a branch's first build (no prior
# successful deploy to diff against) — `git diff --quiet '' <sha>` then fails
# with "fatal: bad revision ''" rather than exiting 0/1, which Vercel treats
# as a build failure. With nothing to diff, always proceed with the build.
#
# It can also be non-empty but no longer resolvable: a force-push after a
# rebase (e.g. rebasing a branch onto a new main before merging) rewrites
# history, so the commit Vercel remembers as "previous" for that branch can
# fall out of the pushed history entirely — `git diff` then fails with
# "fatal: bad object <sha>", which Vercel also treats as a build failure
# (confirmed live: depth#200's rebase produced exactly this). Same fallback:
# with nothing valid to diff against, always proceed with the build.
if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ] || ! git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA" 2>/dev/null; then
  exit 1
fi

git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" -- . \
  ':!skill-observations' \
  ':!skill-updates' \
  ':!docs' \
  ':!README.md' \
  ':!CLAUDE.md' \
  ':!AGENTS.md' \
  ':!ATTRIBUTIONS.md'
