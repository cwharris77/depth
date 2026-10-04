#!/bin/bash
# PreToolUse on `git commit`: typecheck web/ only when the commit touches it.
cmd=$(jq -r '.tool_input.command // empty')
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
files=$(git -C "$root" diff --cached --name-only)
# `git commit -a` stages tracked changes at commit time.
case "$cmd" in *" -a"*|*" -am"*|*"--all"*) files="$files"$'\n'"$(git -C "$root" diff --name-only)";; esac
echo "$files" | grep -q '^web/' || exit 0
cd "$root/web" && npm run typecheck
