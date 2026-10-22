---
name: server-contract-validate
description: >-
  Validate the Next.js server layer against the silent-failure rules this project must satisfy
  — every API route auth-gated, every data.ts query scoped to the owner's userId, inbound
  bodies validated by the Zod contract (not hand-rolled), the British `colour` keys intact, and
  no server code value-imported into client space. Use after changing src/server/**, app/api/**,
  src/lib/library-types.ts, or src/lib/store.ts.
---

# Validate the server layer

The server/API/data layer is multi-user: a few mistakes fail **silently** — they lint, typecheck,
build, and the happy path works, but they leak another user's documents, serve a route
unauthenticated, or drift the API contract. This skill is the repeatable grep pass for those failure
modes. It pairs with the `server-reviewer` agent, which reads the blocks these greps can't.

All commands run from the repo root. The uniform route shell lives in
[src/server/api.ts](../../../src/server/api.ts) (`requireUserId` / `handle` / `parseBody` /
`found` / `objectId`); the ownership filter lives in [src/server/data.ts](../../../src/server/data.ts).

## 1. Every API route is auth-gated

A handler that queries without gating serves data to anyone. Each route must call `requireUserId()`
(or `auth()` for the blob token route).

```bash
for f in $(find app/api -name 'route.ts'); do
  grep -qE 'requireUserId|auth\(' "$f" || echo "UNGATED: $f"
done
```

→ **PASS** if the only `UNGATED:` line is `app/api/auth/[...nextauth]/route.ts` (the NextAuth handler
itself — it has no body to gate). The blob routes gate via `auth()`/`requireUserId` and must **not**
appear here; if one does, it lost its gate. Any other ungated route → **FAIL** (serves data without a
session). Symptom: an unauthenticated request reads/mutates library data.

## 2. Every data query is scoped to the owner

A filter keyed on `_id` alone (no `userId`) is a cross-user read or mutation.

```bash
grep -nE '\.(find|findOne|findOneAndUpdate|deleteOne|deleteMany|updateOne|updateMany)\(' \
  src/server/data.ts | grep -v 'userId' \
  && echo '^^ FAIL: query filter(s) above omit userId' \
  || echo '(every find/update/delete filter mentions userId — PASS)'
```

→ **PASS** if it prints the PASS line. Each query line printed before a `FAIL` is a filter that may
omit `userId` → confirm with the agent. Symptom: one user reads or deletes another's documents.
(`.create({ userId, … })` inserts are not in this check — the agent verifies those carry `userId`.)

## 3. The Zod contract is the single source of truth

Inbound bodies are validated by a schema from the contract, not trusted raw.

```bash
# Routes that read the body raw without parseBody:
grep -rln 'req.json()' app/api | while read -r f; do
  grep -q 'parseBody' "$f" || echo "RAW BODY (no parseBody): $f"
done
# British colour keys must still be present (never renamed to `color`):
grep -c 'colour' src/lib/library-types.ts src/core/defaultTemplate.json
```

→ **PASS** if the only `RAW BODY` line is `app/api/blob/upload` (it hands the body to Vercel's
`handleUpload`, not a library schema) and both `colour` counts are non-zero. A route reading
`req.json()` without a schema → **FAIL** (unvalidated input). A zero `colour` count → **FAIL** (a
`colour`→`color` rename broke Bambu config; see CLAUDE.md "3MF export").

## 4. No server code leaks into the client bundle

Client space must import `@/server` only as `import type`, or a value import pulls DB creds/secrets
into the browser bundle (and `server-only` throws at build).

```bash
grep -rnE "from '@/server" src/lib src/hooks src/features src/components | grep -v 'import type' \
  && echo '^^ FAIL: client value-imports server code' \
  || echo '(no client value-import of @/server — PASS)'
```

→ **PASS** if it prints the PASS line. Any hit → **FAIL**. Symptom: build error, or server secrets in
the client bundle. (`app/**` is intentionally excluded — server components there legitimately import
`@/server`; the agent checks that those files are not `'use client'`.)

## 5. Report

State each check as PASS / FAIL with the offending line quoted, and map any FAIL to its symptom
(cross-user data leak, unauthenticated route, unvalidated input / dropped Bambu colors, server leak in
the client bundle). Note the known deferred items (blob DELETE ownership, per-user quota — CLAUDE.md)
without counting them as new failures. If all pass, say the server contract is intact — then hand the
judgement calls (ownership on by-id writes, mapper leakage, edge-vs-authoritative gate) to the
`server-reviewer` agent.
