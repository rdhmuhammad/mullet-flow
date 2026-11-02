# Runtime Hook Injection

**Summary**: Multi-host environment fingerprinting and adaptive payload formatting for delivering prompt instructions across AI coding agents.
**Sources**: `hooks/ponytail-activate.js`, `hooks/ponytail-runtime.js`, `hooks/ponytail-map.js`
**Last updated**: 2026-11-02

---

## Overview

Ponytail runs a unified `SessionStart` / prompt hook across heterogeneous AI agent tools. [`hooks/ponytail-activate.js`](file:///d:/personal/mullet-flow/hooks/ponytail-activate.js) and [`hooks/ponytail-runtime.js`](file:///d:/personal/mullet-flow/hooks/ponytail-runtime.js) detect the active execution environment and tailor the stdout payload format accordingly.

## Host Detection Fingerprints

| Host Agent | Detection Heuristic |
| :--- | :--- |
| **VS Code Copilot** | `process.env.COPILOT_PLUGIN_DATA` or `.vscode/agent-plugins/` path in `CLAUDE_PLUGIN_ROOT` |
| **Codex** | `process.env.PLUGIN_DATA` |
| **Qoder** | `process.env.QODER_SESSION_ID` |
| **CodeBuddy** | `process.env.CODEBUDDY_PLUGIN_ROOT` |
| **Cursor** | `process.env.CURSOR_VERSION` (isolated hook environment variable) |
| **Claude Code** | Default fallback |

## Payload Formatting Protocol ([`writeHookOutput`](file:///d:/personal/mullet-flow/hooks/ponytail-runtime.js#L110))

1. **Cursor**: Emits JSON `{ additional_context: context, continue: true }`. Raw stdout would trigger JSON parse errors in Cursor's hook supervisor.
2. **VS Code Copilot**: Emits `{ additionalContext: context }`.
3. **Codex / Qoder / CodeBuddy**: Emits `{ hookSpecificOutput: { hookEventName, additionalContext } }`. Bypasses `systemMessage` in Codex to avoid false error/warning badges.
4. **Claude Code**: Emits raw text for `SessionStart`; uses `{ hookSpecificOutput: { hookEventName: 'SubagentStart', ... } }` for delegated subagents.

## Workspace Conflict Avoidance

- **Cursor MDC Guard**: If an always-on rule file exists at `.cursor/rules/ponytail.mdc`, `activate()` skips injecting instructions and yields a notice, avoiding conflicting or duplicate rules.
- **Concurrent Workspace Isolation**: Modes are persisted into `sha256(path.normalize(projectDir))` subpaths under `ponytail-modes/` so sessions in different repositories don't overwrite each other's active mode levels.

## Supplementary Runtime Context

- **Codebase Architecture Map**: Invokes `ponytail-map.js` with a 3-second hard timeout to append an overview of existing repository symbols before user code is generated.
- **Statusline Setup Nudge**: Checks `~/.claude/settings.json` and offers a one-time setup nudge for terminal badges.

## Related pages

- [[index]]
- [[patterns/index]]
- [[concepts/get-ponytail-instructions]]
- [[concepts/mode-resolution-and-validation]]
- [[concepts/prompt-slicing-and-transformation]]
