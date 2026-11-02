# Lightweight Codebase Mapping

**Summary**: Zero-dependency, regex-based architecture summarizer that generates a compact, token-bounded directory index of top-level symbols on session start.
**Sources**: `hooks/ponytail-map.js`, `hooks/ponytail-activate.js`, `tests/map.test.js`
**Last updated**: 2026-11-02

---

## Purpose

Enforces the Ponytail core philosophy: *"Reuse first costs no search"*. By prepending an overview of existing symbols into the session context, the assistant immediately knows what functions, classes, and utilities already exist, preventing duplicate code generation.

## Extraction Mechanism

- **File Discovery ([`listFiles`](file:///d:/personal/mullet-flow/hooks/ponytail-map.js#L37))**: Runs `git ls-files` with a 3-second timeout and 64MB buffer (safe for huge repos); falls back to a shallow filesystem walk (`depth <= 6`) if outside Git.
- **Language-Specific Regex ([`PATTERNS`](file:///d:/personal/mullet-flow/hooks/ponytail-map.js#L25))**:
  - Python: `def <name>`, `class <name>`
  - JS/TS: `export function|class|const|let|enum <name>`, `export { ... }`
  - Go: `func <Name>`, `type <Name>`
  - Rust: `pub fn|struct|enum|trait <name>`
  - Ruby / JVM / Swift / C# / PHP: Top-level classes, methods, records.
  - Ignores internal/private symbols starting with an underscore (`_`).

## Filtering & Prioritization

1. **Exclusions**:
   - Folders (`SKIP_DIR`): `node_modules`, `dist`, `build`, `coverage`, `tests`, `migrations`, `venv`, `fixtures`.
   - Files (`SKIP_FILE`): Unit tests (`test_*`, `*.test.*`, `*.spec.*`), generated code (`*.gen.*`), minified bundles.
2. **Shared Code Priority**:
   - Files matching `SHARED` (`util|helper|lib|common|shared|service|component|hook|core|model|api`) are sorted first so shared abstractions survive tight budgets.

## Token-Budget Constraints

- **Character Cap ([`BUDGET`](file:///d:/personal/mullet-flow/hooks/ponytail-map.js#L16))**: Defaults to `2000` characters (configurable via `PONYTAIL_MAP_CHARS`).
- **Grouping**: Formats output as one line per folder:
  `dir/: symbol1, symbol2, ...`
- **Dynamic Sampling**: If a folder contains $> 8$ files (e.g. large component libraries), it takes only the first export per file; otherwise up to 3.
- **Hard Truncation**: When adding a directory line exceeds the budget, remaining directories are dropped and reported as `(N more folders not listed)`.

## Related pages

- [[index]]
- [[patterns/index]]
- [[patterns/runtime-hook-injection]]
- [[concepts/get-ponytail-instructions]]
