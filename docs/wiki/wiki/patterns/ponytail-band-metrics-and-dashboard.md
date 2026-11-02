# Ponytail Band Metrics and Dashboard

**Summary**: Real-time session monitoring HUD and zero-dependency HTML dashboard tracking token spend, execution duration, and code reuse percentage.
**Sources**: `hooks/band/register.tsx`, `hooks/band/metrics.ts`, `hooks/band/board.ts`, `hooks/band/types.d.ts`
**Last updated**: 2026-11-02

---

## Architecture Overview

The Ponytail Band is an observability system integrated directly into agent session lifecycles. It quantifies whether the model adheres to senior dev principles (e.g. reusing existing codebase functions vs inventing duplicate code) and logs costs into local CSV ledgers.

## Lifecycle Event Interception ([`register.tsx`](file:///d:/personal/mullet-flow/hooks/band/register.tsx#L199))

[`register()`](file:///d:/personal/mullet-flow/hooks/band/register.tsx#L199) (God Node #1 in the knowledge graph with 29 edges) hooks into core engine events:
- **`session.start`**: Extracts all existing codebase symbol definitions via `git grep` and language regexes ([`parseDefs`](file:///d:/personal/mullet-flow/hooks/band/metrics.ts#L52)).
- **`prompt.submit`**: Automatically names the current task from the first user request.
- **`command.run` / `session.end`**: Preserves cost baselines while resetting task-level counters on `/clear` or `/resume`.
- **`turn.end`**: Calculates token usage deltas, execution duration, and appends rows to the CSV ledger.

## Quantitative Metrics ([`metrics.ts`](file:///d:/personal/mullet-flow/hooks/band/metrics.ts))

1. **Code Reuse Tracking ([`callsIn`](file:///d:/personal/mullet-flow/hooks/band/metrics.ts#L70))**:
   Scans newly written code lines to detect calls to known existing codebase symbols (excluding generic names like `get`, `set`, `run`).
2. **Duplicate Detection ([`duplicateOf`](file:///d:/personal/mullet-flow/hooks/band/metrics.ts#L83))**:
   Detects when the model rewrites an existing helper under an identical normalized name in a different file (e.g. `format_price` vs `formatPrice`).
3. **Test Outcome Tracking ([`testCounts`](file:///d:/personal/mullet-flow/hooks/band/metrics.ts#L97))**:
   Parses test runners (`pytest`, `jest`, `vitest`, `cargo test`, `go test`, `node --test`) to record pass/fail counts.

## Zero-Dependency Task Board ([`board.ts`](file:///d:/personal/mullet-flow/hooks/band/board.ts))

[`boardHtml()`](file:///d:/personal/mullet-flow/hooks/band/board.ts) turns the CSV records into a self-contained, standalone HTML dashboard:
- Zero external dependencies: inline CSS, inline SVG logos, and zero CDN scripts.
- Supports dark and light themes (`color-scheme: dark/light`).
- Displays task cards, turn costs, token summaries (`fmtTokens`), duration (`elapsed`), and reuse percentages.

## Related pages

- [[index]]
- [[patterns/index]]
- [[patterns/runtime-hook-injection]]
- [[patterns/lightweight-codebase-mapping]]
- [[concepts/get-ponytail-instructions]]
