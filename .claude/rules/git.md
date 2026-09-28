# Git Conventions

## Commit Messages

Use **Conventional Commits** format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance (deps, config, etc.)
- `docs` — documentation changes
- `refactor` — code change that neither fixes a bug nor adds a feature
- `test` — adding or updating tests
- `ci` — continuous integration changes
- `perf` — performance improvements
- `style` — code style changes (formatting, etc.)

### Scope

Optional but recommended. Examples: `core`, `worker`, `ui`, `mesh`, `tones`, `3mf`, `image`, `deps`.

### Examples

```
feat(tones): pick heights by even CIE L* spacing
fix(mesh): remove diagonal-only pinches before walls
chore(deps): upgrade vite to 8.x
docs(3mf): document Bambu config-loading rules
refactor(worker): extract latest-wins preview queue
test(mesh): assert watertight manifold invariants
```

### Guidelines

- **Use imperative mood** — "add feature" not "added feature"
- **Lowercase** — start with lowercase letter
- **No period** at the end of the description
- **Keep it short** — ideally under 72 characters
- **Be specific** — "fix null check in user query" is better than "fix bug"

## Branch Naming

Format: `<type>/<slug>`

Examples:

- `feat/even-lstar-spacing`
- `fix/mesh-pinch-removal`
- `chore/upgrade-vite`
- `docs/bambu-3mf-notes`

### Guidelines

- **Use kebab-case** for slugs
- **Keep it short** — under 50 characters
- **Be descriptive** — "feat/user-auth" is better than "feat/new-stuff"

## Branching Strategy

- **Never commit directly to `main`** — always use a feature branch.
- **Create a PR** for all changes — even small fixes.
- **Squash merge** — keep main history clean.
- **Delete branch** after merging.

## Pull Requests

- **Use the `/review` command** before creating a PR.
- **Descriptive title** — use conventional commit format.
- **PR description** should include:
  - Summary of changes
  - Test plan
  - Screenshots (if UI changes)
  - Breaking changes (if any)

### PR Template

```markdown
## Summary

- Pick tone heights by even CIE L* spacing instead of linear height
- Recompute swap layers from the new heights
- Add a test asserting monotonic L* ordering

## Test plan

- [ ] `npm test` passes
- [ ] `npm run build` passes (tsc + vite)
- [ ] Manual check: export a 3MF and open it in the slicer
- [ ] No breaking changes to the `Settings` shape
```

## Commit Hygiene

- **One logical change per commit** — don't mix unrelated changes.
- **Commit often** — small commits are easier to review and revert.
- **Write meaningful messages** — future you will thank you.

## Merge Conflicts

- **Resolve locally** before pushing.
- **Test after resolving** — make sure nothing broke.
- **Ask for help** if unsure — better to ask than break something.
