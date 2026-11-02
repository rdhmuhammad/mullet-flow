# Brain Repository and `max` / `ultra-max` Modes

**Summary**: Hybrid markdown knowledge repository (`rules/`, `patterns/`, `architecture/`, `snippets/`, `configs/`) with strict YAML frontmatter validation (`title`, `tags`, `when`) and runtime injection into `max` and `ultra-max` modes.
**Sources**: `hooks/ponytail-brain.js`, `hooks/ponytail-config.js`, `hooks/ponytail-instructions.js`, `skills/ponytail-brain/SKILL.md`, `tests/brain.test.js`
**Last updated**: 2026-11-02

---

## Hybrid Storage & Resolution

[`scanBrain(cwd)`](file:///d:/personal/mullet-flow/hooks/ponytail-brain.js#L40) resolves two roots in order:
1. **Global Brain ([`getBrainDir()`](file:///d:/personal/mullet-flow/hooks/ponytail-config.js#L141))**: `PONYTAIL_BRAIN_DIR` env var -> `brainDir` in `config.json` -> `<getConfigDir()>/brain`.
2. **Repo-Local Brain ([`getLocalBrainDir(cwd)`](file:///d:/personal/mullet-flow/hooks/ponytail-config.js#L152))**: `<cwd>/brain`.

When both exist, documents are merged by `<folder>/<filename>.md` and repo-local files override global files at the same relative path.

## Strict 5-Folder Schema

Only `.md` files inside [`BRAIN_FOLDERS`](file:///d:/personal/mullet-flow/hooks/ponytail-brain.js#L13) (`rules`, `patterns`, `architecture`, `snippets`, `configs`) are scanned. [`parseBrainDoc()`](file:///d:/personal/mullet-flow/hooks/ponytail-brain.js#L16) requires flat YAML frontmatter declaring `title`, `tags`, and `when`. Files missing any of those fields are skipped and reported in `scanBrain().invalid`.

## `max` and `ultra-max` Prompt Injection

When the active mode is `max` (builds on `full`) or `ultra-max` (combines `ultra` pushback with `max`), [`getPonytailInstructions()`](file:///d:/personal/mullet-flow/hooks/ponytail-instructions.js#L78) appends [`buildBrainContext(cwd)`](file:///d:/personal/mullet-flow/hooks/ponytail-brain.js#L97):
- **Unconditional Rules (`rules/*.md` with `when: always` or `when: *`)**: Injected in full under `## Enforced Brain Rules (Always Active)`.
- **Brain Index**: Compact index lines (`- <folder>/<file>.md (path: <absPath>) — <title> | tags: <tags> | when: <when>`) for conditional `rules/*.md` and all `patterns/`, `architecture/`, `snippets/`, and `configs/` documents.
- **Execution Protocol**: Instructs the agent to understand the plan first, read matched Brain Index files, enforce `rules/` above generic YAGNI rules, and cite `Brain applied: <docs or none>` in its reply.

## Related pages

- [[index]]
- [[concepts/index]]
- [[concepts/mode-resolution-and-validation]]
- [[concepts/get-ponytail-instructions]]
