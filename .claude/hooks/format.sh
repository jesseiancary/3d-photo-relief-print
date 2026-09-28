#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): format the just-edited file with Prettier.
#
# Reads the hook JSON payload on stdin and formats only the edited file, so the
# `format:check` CI gate never fails on whitespace. Prettier honours
# .prettierignore automatically (e.g. src/core/defaultTemplate.json stays
# byte-for-byte). Parsed with node — this is a Node project, so it is always
# present, whereas jq may not be.
set -euo pipefail

dir="${CLAUDE_PROJECT_DIR:-.}"

read_field() {
  node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(String(JSON.parse(d).tool_input?.file_path??""))}catch{process.stdout.write("")}})'
}

file="$(read_field || true)"
[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

bin="$dir/node_modules/.bin/prettier"
[ -x "$bin" ] || exit 0

# --ignore-unknown keeps prettier from erroring on non-formattable extensions.
"$bin" --write --ignore-unknown "$file" >/dev/null 2>&1 || true
exit 0
