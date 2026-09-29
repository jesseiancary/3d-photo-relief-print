# Core Purity

`src/core/` is the whole engine and must stay **pure and framework-free** — pure functions over typed arrays, nothing else. This is what lets the same code run in the browser, in the Web Worker, in the Node CLI ([scripts/cli.ts](../../scripts/cli.ts)), and under vitest.

## Rules for `src/core/`

- **No DOM** — no `window`, `document`, `navigator`, `canvas`, `ImageBitmap`, `OffscreenCanvas`, `fetch`, `localStorage`, or `URL.createObjectURL`.
- **No React** — no imports from `react` / `react-dom`, no JSX, no hooks.
- **No worker APIs** — no `postMessage`, `self`, `onmessage`, or `importScripts`.
- **No Node built-ins** in the modules themselves — `fs`/`path` belong in `scripts/cli.ts`, not in core. Core receives already-decoded typed arrays.
- **No hidden global state** — functions take their inputs as arguments and return results; the central `Settings` object ([src/core/types.ts](../../src/core/types.ts)) is threaded through, not read from a global.

## Where the impurity lives instead

- **DOM / image decoding** → the React layer ([src/components/](../../src/components/), [src/features/](../../src/features/), [src/hooks/](../../src/hooks/), [src/lib/](../../src/lib/)) and [src/worker/handler.ts](../../src/worker/handler.ts) (which caches the source `ImageBitmap` at several resolutions, then hands typed arrays to core).
- **Browser platform (localStorage, canvas, file save/pick)** → [src/lib/](../../src/lib/), consumed by hooks/components.
- **Messaging / threading** → [src/worker/](../../src/worker/) (`protocol.ts` contract, `client.ts` Engine, `handler.ts` logic — the same `createHandler` also runs on the main thread as a fallback).
- **File I/O** → [scripts/cli.ts](../../scripts/cli.ts).

## Why

If core stays pure, every stage is unit-testable in isolation (`src/core/*.test.ts`), the CLI can reproduce any browser result headlessly, and the worker/main-thread fallback stay behaviourally identical. A single DOM or React import in core breaks all four call sites at once.
