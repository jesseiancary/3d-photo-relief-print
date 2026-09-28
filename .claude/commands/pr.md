---
description: Generate PR title and description following industry best practices
---

# Generate Pull Request Content

Generate a pull request title and description based on the current branch's changes.

## Workflow

1. **Analyze git context:**

   ```bash
   git status
   git diff main...HEAD --stat
   git log main..HEAD --oneline
   git diff main...HEAD
   ```

2. **Review all changes:**
   - Read full diff to understand what changed
   - Identify the primary purpose (feat/fix/refactor/docs/etc.)
   - Note any breaking changes or important details
   - Check for related issues/tickets

3. **Generate PR title** following Conventional Commits format:
   - Format: `type(scope): description`
   - Max 72 characters
   - Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`
   - Scopes: `core`, `worker`, `ui`, `mesh`, `tones`, `3mf`, `image`, `deps`
   - Use imperative mood ("add" not "added")
   - Examples:
     - `feat(tones): pick heights by even CIE L* spacing`
     - `fix(mesh): remove diagonal-only pinches before walls`
     - `refactor(worker): extract latest-wins preview queue`

4. **Generate PR description** in markdown with these sections:

   ```markdown
   ## Summary

   [2-4 sentence overview of what this PR does and why]

   ## Changes

   - [Bulleted list of key changes]
   - [Use present tense: "Adds X", "Updates Y", "Fixes Z"]
   - [Group related changes together]

   ## Technical Details

   [Optional: Any implementation notes, architectural decisions, or trade-offs]

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

5. **Output format:**

   **CRITICAL: Output raw markdown source code, not rendered markdown.**

   The user needs to copy-paste the markdown source. Format your response like this:

   ````
   **PR Title:**
   chore(scope): description here

   **PR Description (raw markdown - copy this):**
   ```markdown
   ## Summary

   [content here...]

   ## Changes

   - Item 1
   - Item 2

   [etc...]
   ````

   ````

   **RULES:**
   - Put the description inside a markdown code block (```markdown ... ```)
   - This ensures the user sees the raw markdown source, not rendered HTML
   - NO warnings about being on main branch
   - NO instructions for creating feature branches
   - The user handles branching workflow - just provide the title and description
   ````

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
- **Testing evidence** — Checkboxes show what verification was done
- **Linked issues** — Automatic issue closing via GitHub keywords

### Writing Style

- **Present tense** — "Adds" not "Added" (matches Conventional Commits)
- **Active voice** — "This PR adds" not "X is added by this PR"
- **Concrete specifics** — "Reduces query time by 40%" not "Improves performance"
- **Audience-aware** — Assume reviewer knows the codebase but not your thought process

## Example Output

**PR Title:**
feat(tones): pick layer heights by even CIE L* spacing

**PR Description (raw markdown - copy this):**

```markdown
## Summary

Improves how the tone model chooses layer heights. Previously heights were spaced linearly, which clustered visually similar tones and wasted contrast. This PR picks the heights whose simulated colours are most evenly spaced in CIE L*, so terraces read as distinct steps.

## Changes

- Simulates colour at every candidate layer height (`src/core/tones.ts`)
- Selects heights to maximise even spacing in CIE L*
- Recomputes filament swap layers from the chosen heights
- Adds a test asserting monotonic L* ordering across tones

## Technical Details

The first filament remains an opaque base; each later filament is a band of layers blending toward its colour (full coverage ≈ TD × 0.1 mm). Height selection now runs a pass over the simulated tone curve rather than assuming linear steps, so the change is confined to `tones.ts` and does not touch the mesh or 3MF stages.

## Testing

- [x] Tests added for L* spacing (`npm test`)
- [x] `npm run build` passes (tsc + vite)
- [x] Manual testing: exported a 3MF and confirmed swap layers in the slicer
- [x] All tests passing

## Related Issues

Closes #42

---
```

## Notes

- **DO NOT** create the PR or push to GitHub — only generate the content
- **DO NOT** warn about being on main branch — user handles branching workflow
- **DO NOT** provide instructions for creating feature branches
- **DO** analyze the full diff, not just the latest commit message
- **DO** look for breaking changes and call them out explicitly
- **DO** verify test coverage in the diff before claiming tests were added
- **DO** output raw markdown (no code blocks wrapping the description)

## See Also

- `.claude/rules/git.md` — Conventional commit format
- `.claude/commands/review.md` — Pre-PR code review checklist
- `CLAUDE.md` — Git workflow and PR merge process
