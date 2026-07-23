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
if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then
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
