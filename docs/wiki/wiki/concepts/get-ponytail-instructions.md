# getPonytailInstructions

**Summary**: Central prompt compilation function connecting runtime hooks, editor plugins, and tests to the Ponytail instruction set.
**Sources**: `hooks/ponytail-instructions.js`, `hooks/ponytail-activate.js`, `pi-extension/index.js`, `.opencode/plugins/ponytail.mjs`, `tests/hooks.test.js`
**Last updated**: 2026-11-02

---

## Overview

`getPonytailInstructions()` (defined in [`hooks/ponytail-instructions.js`](file:///d:/personal/mullet-flow/hooks/ponytail-instructions.js#L77)) acts as the universal prompt compiler and dispatcher for Ponytail across all supported host agent environments.

## Cross-Community Architecture

In the codebase knowledge graph, `getPonytailInstructions()` is a primary bridge node (high betweenness centrality) connecting four major subsystems:

1. **Ponytail Runtime (`hooks/ponytail-activate.js`, `hooks/ponytail-mode-tracker.js`)**:
   - `activate()` calls `getPonytailInstructions()` to inject compiled instructions into runtime hooks (Claude Code, Cursor, CodeBuddy).
   - `finish()` invokes it during statusline and mode tracker teardown.

2. **Pi Extension Integration (`pi-extension/index.js`)**:
   - `ponytailExtension()` calls `getPonytailInstructions()` to supply mode-specific prompt instructions to the Pi coding extension.
   - Relies on `normalizePersistedMode()` for persisted settings.

3. **OpenCode Plugin Integration (`.opencode/plugins/ponytail.mjs`)**:
   - Both `setup()` and `server()` call `getPonytailInstructions()` to load instructions for OpenCode plugin endpoints.
   - Uses `normalizeMode()` from `hooks/ponytail-config.js`.

4. **Hooks Integration Tests (`tests/hooks.test.js`)**:
   - Imports and asserts instruction contents against expected mode outputs and boundary rules.

## Related pages

- [[index]]
- [[concepts/index]]
- [[patterns/index]]
