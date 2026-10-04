#!/bin/bash
# PostToolUse: keep generated artifacts in sync after edits to their sources.
f=$(jq -r '.tool_input.file_path // .tool_input.path // empty')
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
case "$f" in
  */project.yml)
    (cd "$root" && xcodegen generate >/dev/null 2>&1) \
      && echo "Ran xcodegen generate — commit Depth.xcodeproj with project.yml. Check git status for stray scheme rewrites." \
      || echo "xcodegen generate failed — run it by hand from the repo root." >&2
    ;;
  */web/lib/utils/depth-chart/formations.ts|*/web/lib/utils/roster/roster.ts)
    echo "Domain logic changed: run 'npx tsx fixtures/generate.mts' from web/ and commit web/fixtures/domain/*.json."
    ;;
  */web/components/ui/tokens.ts)
    echo "Web token changed: update Depth/Support/DesignTokens.swift in the same PR."
    ;;
esac
exit 0
