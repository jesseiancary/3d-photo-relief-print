#!/usr/bin/env bash
# PreToolUse hook (Bash): block committing directly to main.
#
# Enforces the "never commit directly to main" rule in .claude/rules/git.md.
# Exit code 2 blocks the tool call and feeds stderr back to Claude. Any other
# git command, or any non-main branch, passes through untouched. The command is
# parsed with node (always present in this Node project; jq may not be).
set -euo pipefail

dir="${CLAUDE_PROJECT_DIR:-.}"

cmd="$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(String(JSON.parse(d).tool_input?.command??""))}catch{process.stdout.write("")}})' || true)"

# Only intervene when `commit` appears as a whitespace-delimited git subcommand
# (allowing global flags/values like `git -C dir commit`). Requiring whitespace
# right before `commit` avoids matching `git log --grep=commit`, where `commit`
# is preceded by `=`. `[^|&;]*` keeps the match within a single command segment.
printf '%s' "$cmd" | grep -Eq '\bgit\b[^|&;]*[[:space:]]commit\b' || exit 0

branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
if [ "$branch" = "main" ]; then
  echo "Blocked: direct commits to 'main' are not allowed (see .claude/rules/git.md)." >&2
  echo "Create a feature branch first:  git checkout -b <type>/<slug>" >&2
  exit 2
fi
exit 0
