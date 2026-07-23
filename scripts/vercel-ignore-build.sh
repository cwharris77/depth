#!/usr/bin/env bash
# Vercel ignoreCommand: skip builds whose only changes are internal docs/logs.
#
# Vercel's convention: exit 1 = continue the build, exit 0 = skip it
# (docs/project-configuration/project-settings#ignored-build-step). `git diff
# --quiet` already exits 0 when the compared paths show no differences and 1
# when they do, so diffing everything EXCEPT the ignored paths and passing its
# exit code straight through lines up with Vercel's convention with no
# inversion needed.
git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" -- . \
  ':!skill-observations' \
  ':!skill-updates' \
  ':!docs' \
  ':!README.md' \
  ':!CLAUDE.md' \
  ':!AGENTS.md' \
  ':!ATTRIBUTIONS.md'
