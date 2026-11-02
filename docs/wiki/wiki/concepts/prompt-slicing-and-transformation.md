# Prompt Slicing and Transformation

**Summary**: Line-by-line regex filtering mechanism that tailors system prompt intensity and examples to the active Ponytail mode while preserving invariant rules.
**Sources**: `hooks/ponytail-instructions.js`, `skills/ponytail/SKILL.md`
**Last updated**: 2026-11-02

---

## Architecture Overview

Rather than maintaining separate, drifting instruction documents for each mode (`lite`, `full`, `ultra`), Ponytail compiles them dynamically from a single canonical document ([`skills/ponytail/SKILL.md`](file:///d:/personal/mullet-flow/skills/ponytail/SKILL.md)) via [`filterSkillBodyForMode()`](file:///d:/personal/mullet-flow/hooks/ponytail-instructions.js#L11).

## Transformation Pipeline

1. **Frontmatter Stripping**: Removes YAML metadata blocks (`/^---[\s\S]*?---\s*/`).
2. **Table Row Slicing**:
   - Matches rows formatted as `^\|\s*\*\*(.+?)\*\*\s*\|`.
   - If the label matches a valid mode name, only the row matching `effectiveMode` is kept; other mode intensity descriptions are dropped.
3. **Example Bullet Filtering**:
   - Matches quoted examples: `^-\s*([^:]+):\s*"`.
   - Requires quotes so ordinary prose bullets starting with a capitalized mode name (e.g., `"- Full: ..."`) are not accidentally discarded.
4. **Invariant Rule Preservation**:
   - All core rules ("Before you write", "The smallest complete change", "Never cut") survive verbatim across all modes.

## Mode Dispatch Special Cases

- **Independent Modes (`review`)**: Bypasses `SKILL.md` entirely; returns a one-liner redirecting behavior to `/ponytail-review`.
- **Fault-Tolerant Fallback**: If reading `SKILL.md` fails (e.g. standalone/isolated runtime), [`getFallbackInstructions()`](file:///d:/personal/mullet-flow/hooks/ponytail-instructions.js#L43) returns hardcoded core rules identical to `AGENTS.md`.

## Related pages

- [[index]]
- [[concepts/index]]
- [[concepts/get-ponytail-instructions]]
- [[concepts/mode-resolution-and-validation]]
