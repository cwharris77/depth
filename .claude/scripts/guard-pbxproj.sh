#!/bin/bash
# PreToolUse: refuse hand edits to the generated Xcode project file.
f=$(jq -r '.tool_input.file_path // .tool_input.path // empty')
case "$f" in
  *Depth.xcodeproj/project.pbxproj)
    echo "project.pbxproj is generated. Edit project.yml, then run 'xcodegen generate' from the repo root." >&2
    exit 2
    ;;
esac
