# Mullet Flow (Ponytail + Brain)

> *He says nothing. He writes one line. It works.*

> [!NOTE]
> **Fork & Enhancement Disclaimer**:
> This repository is a fork of [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) enhanced with **Brain Knowledge Management** (`max` and `ultra-max` modes) to persist and recall project rules, patterns, architecture, snippets, and configs.
>
> This fork is work by **Antigravity**. For the upstream backstory, full benchmarks, band metrics, and original documentation, visit [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail).

---

## What is Ponytail?

Ponytail puts the lazy senior developer inside your AI coding agent. It enforces YAGNI (You Aren't Gonna Need It), prioritizes code reuse and platform standard libraries, avoids bloated abstractions, and leaves minimal test checks for non-trivial logic.

---

## Installation

### Claude Code
```bash
/plugin marketplace add rdhmuhammad/mullet-flow
/plugin install ponytail@mullet-flow
```
*(Or install locally from the repo root via `/plugin install .`)*

### Codex
```bash
codex plugin marketplace add rdhmuhammad/mullet-flow
codex plugin add ponytail@mullet-flow
```
*(Open `/hooks` in Codex, trust the lifecycle hooks, and start a new thread)*

### OpenCode / Pi Extension
Clone or link into your extensions directory or install dependencies:
```bash
npm install
```

### Any Other Agent (Cursor, Windsurf, Copilot, Cline, Gemini)
Copy [`AGENTS.md`](AGENTS.md) into your project root, or configure [`skills/ponytail/SKILL.md`](skills/ponytail/SKILL.md) as a custom skill. See **[INSTALL.md](INSTALL.md)** for step-by-step instructions.

---

## Basic Usage

Set or switch the intensity mode anytime in your conversation:
- `/ponytail lite`: Builds what was requested; names the smaller option in one line.
- `/ponytail full`: The default lazy senior dev mode (smallest complete change, test check on non-trivial logic).
- `/ponytail ultra`: Pushes back and challenges unnecessary requirements before building.
- `/ponytail max`: Combines `full` mode with automated Brain retrieval, rule enforcement, and citations.
- `/ponytail ultra-max`: Combines `ultra` scope challenges with automated Brain retrieval and rule enforcement.
- `/ponytail off`: Temporarily deactivates Ponytail.

### Commands

| Command | What it does |
|---------|--------------|
| `/ponytail [lite \| full \| ultra \| max \| ultra-max \| off]` | Set the mode, switch to Brain-assisted modes, or toggle off. Bare `/ponytail` activates default mode or reports current level. |
| `/ponytail brain [init \| list [folder] \| search <term> \| path <dir>]` | Scaffold Brain folders (`init`), list documents (`list`), search tags/titles (`search`), or view/set global Brain path (`path`). |
| `/ponytail-brain` | Interactively capture a rule, pattern, snippet, or architecture note from the current chat into your Brain. |
| `/ponytail-review` | Senior dev diff review: bugs, security, real load, missing tests, and what to cut. |
| `/ponytail-audit` | Whole-repo quality audit, ranked by urgency. |
| `/ponytail-debt` | Collects `shortcut:` comments into a prioritized debt ledger. |
| `/ponytail-gain` | Shows measured reduction in code, cost, and latency. |
| `/ponytail-help` | Quick reference card for modes and commands. |

---

## Unique Feature: Brain Management

The standout feature of this fork is **Brain Management**, allowing your agent to recall project and global markdown knowledge files across sessions without prompt bloat or manual copy-pasting.

### Brain Modes (`max` and `ultra-max`)

- **`max`**: After understanding your task, the agent scans the Brain Index, loads matching documents, strictly enforces rules from `rules/` above generic YAGNI defaults, and cites applied documents (`Brain applied: ...`).
- **`ultra-max`**: Combines `ultra` mode (questions the request and challenges scope first) with Brain indexing, rule enforcement, and citations.

### Storage Hierarchy & Structure

Brain documents live across two merged layers (repo-local `./brain/` overrides global storage when relative paths collide):
- **Global repository**: `~/.config/ponytail/brain` (Windows: `%APPDATA%\ponytail\brain`, or configured via `PONYTAIL_BRAIN_DIR`).
- **Repo-local repository**: `./brain/` in your workspace root.

Documents are organized into 5 strict categories:

| Folder | Purpose |
|---|---|
| `rules/` | Mandatory constraints and guardrails. Files with `when: always` are injected in full on every turn; conditional rules are loaded on demand. |
| `patterns/` | Design patterns, API conventions, and implementation idioms. |
| `architecture/` | Module boundaries, directory structures, and subsystem layouts. |
| `snippets/` | Reusable reference code templates and idioms. |
| `configs/` | Framework configs, linter rules, and test runner setups. |

### Subfolder Organization & Tag Inheritance

Documents can be nested in subfolders inside any category (up to 4 levels deep) for clean organization:

```text
brain/
├── patterns/
│   ├── react/
│   │   ├── hooks.md      <-- Automatically inherits tag 'react'
│   │   └── state.md      <-- Automatically inherits tag 'react'
│   └── laravel/
│       └── eloquent.md   <-- Automatically inherits tag 'laravel'
└── architecture/
    └── auth/
        └── oauth.md      <-- Automatically inherits tag 'auth'
```

- **Automatic Tag Inheritance**: Parent subfolder names are automatically indexed as document tags.
- **Path-Based Override**: Local `./brain/patterns/react/hooks.md` overrides global `patterns/react/hooks.md`.

### Document Format

Every `.md` document in the Brain must begin with YAML frontmatter specifying `title`, `tags`, and `when`:

```markdown
---
title: Fastify Error Handler Pattern
tags: fastify, errors, api, handlers
when: building or editing API route error handlers
---

Always use the custom AppError class and serialize responses with schema validation...
```

### Quick Start with Brain

1. **Scaffold folders**:
   ```bash
   /ponytail brain init          # Local ./brain/ in project root
   /ponytail brain init --global # Global ~/.config/ponytail/brain
   ```
2. **List and diagnose documents**:
   ```bash
   /ponytail brain list
   /ponytail brain list patterns/react
   ```
3. **Search the library**:
   ```bash
   /ponytail brain search authentication
   ```
4. **Switch to Brain mode**:
   ```bash
   /ponytail max
   # or
   /ponytail ultra-max
   ```
5. **Capture knowledge from chat**:
   Run `/ponytail-brain` to format and persist patterns or rules discovered during your coding session directly into the Brain repository.

---

## License

[MIT](LICENSE) — Based on the original work by [Dietrich Gebert](https://github.com/DietrichGebert/ponytail).
