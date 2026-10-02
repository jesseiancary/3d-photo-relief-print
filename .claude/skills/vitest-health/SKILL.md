---
name: vitest-health
description: >-
  Validate the Vitest suite against the silent-failure rules this project must
  satisfy — no stray .only/.skip, DOM specs carry the jsdom pragma, the seeded
  LCG is reused from the shared fixture (not re-defined), and no file lacks an
  assertion. Use after changing test files, src/test/**, or vitest.config.ts.
---

# Validate the Vitest suite

The suite has three layers (see [.claude/rules/testing.md](../../rules/testing.md) and the
"Testing" section of [CLAUDE.md](../../../CLAUDE.md)). A handful of test mistakes fail
**silently** — they lint, typecheck, and the run still reports green, but a test is skipped,
runs in the wrong environment, or asserts nothing. This skill is the repeatable check for
those failure modes.

All commands run from the repo root.

## 1. No stray `.only`

A `.only` silently skips every other test in the file — the run stays green while most of the
suite never executes.

```bash
grep -rnE '\b(describe|it|test)\.only\b' src
```

→ **PASS** if empty. Any hit → **FAIL** (remove the `.only`).

## 2. `.skip` is justified

```bash
grep -rnE '\b(describe|it|test)\.skip\b|\bxit\b|\.todo\b' src
```

→ **WARN**, not a hard fail. List each hit for human confirmation — a parked test is fine
only with a comment saying why. Symptom of an unexplained one: coverage quietly lost.

## 3. DOM specs declare the jsdom pragma

Every spec that touches DOM/React APIs must carry `// @vitest-environment jsdom` on line 1,
or it runs in the Node default and throws or silently no-ops. All `*.test.tsx` are DOM by
nature; a `*.test.ts` using those APIs needs the pragma too.

```bash
for f in $(grep -rlE 'renderHook|fireEvent|localStorage|document\.|window\.| render\(' \
          src --include='*.test.ts' --include='*.test.tsx'); do
  head -1 "$f" | grep -q 'vitest-environment jsdom' || echo "MISSING pragma: $f"
done
```

→ **PASS** if it prints nothing. Each `MISSING pragma:` line → **FAIL** (add the pragma).
Symptom: a DOM test silently running in Node — green but meaningless.

## 4. The seeded LCG is reused, not re-defined

The glibc LCG and the other oracles live in [src/test/helpers.ts](../../../src/test/helpers.ts).
A copy in a spec means the shared fixture was ignored (a maintenance trap, and a drift risk).

```bash
grep -rn '1103515245' src
```

→ **PASS** if the only hit is `src/test/helpers.ts`. Any hit in a `*.test.*` file → **FAIL**
(import `lcg`/`randGray`/`randGrid` from the helper instead).

## 5. No assertion-less test file

Heuristic, file-level: a spec that defines tests but never calls `expect(` almost certainly
proves nothing.

```bash
for f in $(grep -rlE '\b(it|test)\(' src --include='*.test.ts' --include='*.test.tsx'); do
  grep -q 'expect(' "$f" || echo "NO expect(): $f"
done
```

→ **PASS** if empty. Each `NO expect():` line → **FAIL**. (This is file-level; a single
assertion-less `it` inside an otherwise-asserting file won't show here — that one is the
`test-reviewer` agent's job to catch by reading the block.)

## 6. Report

State each check as PASS / FAIL / WARN with the offending line quoted on failure, and map any
FAIL back to its symptom (skipped coverage, DOM test running in Node, drifted fixture,
test that proves nothing). If all pass, say the suite is structurally sound — then hand off
any judgement calls (false-green assertions, over-casting) to the `test-reviewer` agent, which
reads the blocks the greps can't.
