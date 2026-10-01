# Review Command

Run a pre-PR checklist before creating a pull request.

This is a browser-only tool (no backend, no auth, no network). The checklist reflects that: correctness of the image → tone → mesh → 3MF pipeline, type safety, and tests.

## Checklist

### Type Safety

- [ ] `npm run build` passes (`tsc -b` runs first — strict mode across all project references)
- [ ] No new `any` types
- [ ] No type assertions (`as`) without a comment explaining why

### Tests

- [ ] All tests pass (`npm test`)
- [ ] New core logic has a test in `src/core/*.test.ts`
- [ ] Edge cases covered (empty/1px images, single filament, extreme levels/gamma)
- [ ] A single test file can be run in isolation (`npx vitest run src/core/<file>.test.ts`)

### Core Pipeline (`src/core/`)

- [ ] Core modules stay pure — no DOM, no worker, no React imports
- [ ] `Settings` changes threaded through `types.ts` and honoured by every stage
- [ ] Tone model changes keep tones evenly spaced in CIE L* and derive valid swap layers
- [ ] Mesh stays watertight: every edge shared by exactly two triangles, no T-junctions, no diagonal-only pinches (`fixPinches`)
- [ ] Manifold/mesh invariants still asserted by tests

### 3MF Export (the subtle part)

- [ ] Read `docs/bambu-3mf-export.md` before changing 3MF output
- [ ] Bambu project mode reuses a real slicer template verbatim except recoloured filament slots + layer heights
- [ ] Model `Application` tag reads `BambuStudio-<version>` (else Bambu Studio drops config)
- [ ] `[Content_Types].xml` does NOT declare `project_settings.config` as `application/xml`
- [ ] Plain-geometry mode still emits valid core-spec 3MF + `swap-instructions.txt`
- [ ] End-to-end 3MF test still passes

### Worker (`src/worker/`)

- [ ] Message contract in `protocol.ts` kept in sync between client and handler
- [ ] Preview path stays latest-wins (one in flight, one queued)
- [ ] Main-thread fallback still works when a worker can't start

### Code Quality

- [ ] Linter passes (`npm run lint`)
- [ ] No commented-out code
- [ ] No stray `console.log`
- [ ] Functions are single-purpose; names are descriptive

### UI (React)

- [ ] Inputs have labels; interactive elements are focusable with visible focus states
- [ ] Slider drags stay responsive (previews don't back up)
- [ ] Loading/empty/error states handled (not a blank screen)
- [ ] Design system intact — consume token utilities (no scattered raw values), type roles used alone, new `--text`/`--radius`/`--shadow` tokens registered in [cn.ts](../../src/lib/cn.ts), `color-mix` tokens out of `@theme inline`. For non-trivial styling changes run the `tailwind-tokens-validate` skill or the `design-system-reviewer` agent.

### Git

- [ ] Conventional commit messages (see `.claude/rules/git.md`)
- [ ] Branch name follows conventions
- [ ] No secrets or large binaries committed

### Documentation

- [ ] `CLAUDE.md` / `README.md` updated if architecture or commands changed
- [ ] `.claude/` tooling still accurate — commands, file paths, and invariants in the commands/agents/skills/rules match the current code (e.g. renamed modules, changed npm scripts, or new CI gates are reflected)
- [ ] Breaking changes noted
