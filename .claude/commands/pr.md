---
description: Verify the change is ready, then generate PR title and description
---

# Generate Pull Request Content

Running this command is the user's signal that they believe the change is ready. Treat it as a **readiness gate**: prove the change is sound _first_, then generate a pull request title and description from the current branch's changes.

Do **not** commit, push, or create the PR. Do **not** warn about the branch — the user handles branching. This command verifies and writes content; it makes no outward changes.

## Workflow

### 1. Preflight gates (run before writing anything)

Run the full CI matrix locally — the same gates as [verify.md](verify.md) — **without stopping at the first failure** so the user sees everything in one pass. The gate list is **not hardcoded here**: read [.github/workflows/ci.yml](../../.github/workflows/ci.yml) (the single source of truth) and run exactly the check commands it defines, so this stays correct as CI evolves.

```bash
set +e
# Substitute the commands extracted from ci.yml. At the time of writing:
for gate in "npm run lint" "npm run format:check" "npx tsc -b" "npm test" "npm run build" "npm run build:single"; do
  echo "=== $gate ==="; eval "$gate"; echo "exit=$? :: $gate"
done
```

Then, **only if the diff touches** `src/core/mesh.ts`, `src/core/tones.ts`, `src/core/pipeline.ts`, or the 3MF export path ([threemf.ts](../../src/core/threemf.ts) / [template.ts](../../src/core/template.ts)), launch the `pipeline-reviewer` agent and collect its findings. (Detect with `git diff main...HEAD --name-only`.)

**Gate rule:**

- If any CI gate fails → **STOP. Do not generate PR content.** Report the failing gate(s) with the key error lines and the offending file/line. If `format:check` is the only failure, note it is auto-fixable with `npm run format` (and normally prevented by the format-on-edit hook).
- If the reviewer reports confirmed defects → surface them and **ask the user to confirm** before proceeding to content generation.
- If all gates pass and the review is clean → continue.

### 2. Analyze git context

```bash
git status
git diff main...HEAD --stat
git log main..HEAD --oneline
git diff main...HEAD
```

### 3. Review all changes

- Read the full diff to understand what changed
- Identify the primary purpose (feat/fix/refactor/docs/etc.)
- Note any breaking changes or important details
- Check for related issues/tickets

### 4. Generate PR title (Conventional Commits)

- Format: `type(scope): description`
- Max 72 characters
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`
- Scopes: `core`, `worker`, `ui`, `mesh`, `tones`, `3mf`, `image`, `deps`
- Use imperative mood ("add" not "added")
- Examples:
  - `feat(tones): pick heights by even CIE L* spacing`
  - `fix(mesh): remove diagonal-only pinches before walls`
  - `refactor(worker): extract latest-wins preview queue`

### 5. Generate PR description (markdown)

```markdown
## Summary

[2-4 sentence overview of what this PR does and why]

## Changes

- [Bulleted list of key changes]
- [Use present tense: "Adds X", "Updates Y", "Fixes Z"]
- [Group related changes together]

## Technical Details

[Optional: implementation notes, architectural decisions, or trade-offs]

## Breaking Changes

[Only if applicable - what breaks and migration path]

## Testing

- [ ] Tests added/updated (`npm test`)
- [ ] `npm run build` passes (tsc + vite)
- [ ] Manual testing completed (exported and opened a 3MF where relevant)
- [ ] All tests passing

## Related Issues

[If applicable: Closes #123, Fixes #456]
```

Because the preflight gates just ran, fill the Testing checkboxes from **actual results** — check what passed, and only claim tests were added if the diff shows them.

### 6. Output format

Lead with a one-line **readiness verdict** reflecting the preflight, then the content.

**CRITICAL: Output raw markdown source, not rendered markdown** — the user copy-pastes it.

````
Readiness: ✅ all gates passed (lint, format, typecheck, test, build, single) · review clean

**PR Title:**
type(scope): description here

**PR Description (raw markdown - copy this):**
```markdown
## Summary

[content here...]

## Changes

- Item 1
- Item 2

[etc...]
````

**RULES:**

- Put the description inside a markdown code block (` ```markdown ... ``` `) so the user sees raw source
- NO warnings about being on main branch — the user handles the branching workflow
- Provide only the readiness verdict + title + description

## Best Practices Applied

### Title Guidelines (Conventional Commits)

- **Type prefix** — Makes PR purpose clear at a glance
- **Scope** — Identifies affected area (optional but recommended)
- **Imperative mood** — "Add feature" not "Added feature" or "Adds feature"
- **Lowercase** — Except for proper nouns (e.g., "Bambu", "3MF", "CIE L*")
- **No period** — Title is a phrase, not a sentence
- **72 char limit** — Ensures readability in git log and GitHub UI

### Description Guidelines (Industry Standard)

- **Summary first** — Busy reviewers should understand the PR in 30 seconds
- **What and Why** — Not just what changed, but why it matters
- **Bulleted changes** — Easier to scan than paragraphs
- **Testing evidence** — Checkboxes reflect the preflight results, not guesses
- **Linked issues** — Automatic issue closing via GitHub keywords

### Writing Style

- **Present tense** — "Adds" not "Added"
- **Active voice** — "This PR adds" not "X is added by this PR"
- **Concrete specifics** — "Reduces query time by 40%" not "Improves performance"
- **Audience-aware** — Assume reviewer knows the codebase but not your thought process

## Notes

- **DO NOT** create the PR or push to GitHub — only verify and generate content
- **DO NOT** commit — the user controls commits (and `guard-main` blocks commits on `main`)
- **DO NOT** warn about being on main or provide branching instructions
- **DO** run the preflight gates first and refuse to generate content for a red build
- **DO** analyze the full diff, not just the latest commit message
- **DO** look for breaking changes and call them out explicitly
- **DO** verify test coverage in the diff before claiming tests were added
- **DO** output raw markdown (description wrapped in a fenced block)

## See Also

- [verify.md](verify.md) — the CI gate matrix this command runs as preflight
- `.claude/agents/pipeline-reviewer.md` — domain review for core/3MF changes
- `.claude/rules/git.md` — Conventional commit format
- [CLAUDE.md](../../CLAUDE.md) — Git workflow and automated-review policy
