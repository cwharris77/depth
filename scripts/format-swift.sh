#!/usr/bin/env bash
# scripts/format-swift.sh
#
# Deterministically rewrites Swift files to the repo's style (`.swift-format`: 4-space indent,
# 100 columns). Every line of the iOS app is agent-written, so style is fixed by tool, never
# gated: the pre-commit hook (.githooks/pre-commit) runs this on staged files, and agents can
# run it by hand. There is deliberately no CI format check -- CI uses `latest-stable` Xcode, so
# its swift-format can drift from a local one and would fail PRs over toolchain differences
# (DEP-604).
#
# Usage:
#   scripts/format-swift.sh                 # format Depth/, DepthTests/, DepthUITests/
#   scripts/format-swift.sh path/File.swift # format only the given files

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [ "$#" -gt 0 ]; then
  xcrun swift-format format --in-place "$@"
else
  xcrun swift-format format --in-place --recursive Depth DepthTests DepthUITests
fi
