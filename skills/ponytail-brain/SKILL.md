---
name: ponytail-brain
description: >
  Manage the Brain markdown knowledge repository (`rules/`, `patterns/`,
  `architecture/`, `snippets/`, `configs/`): initialize folders, list indexed or
  invalid documents, or capture a new rule, pattern, snippet, architecture note,
  or config from the current session with valid `title`, `tags`, and `when`
  frontmatter. Use for /ponytail-brain, "save to brain", "add brain rule",
  "list brain".
argument-hint: "[init|list|path <dir>|save <folder>/<name>.md]"
license: MIT
---

# Ponytail Brain

Manage or populate the Brain repository used by `max` and `ultra-max` modes.

## Schema

Brain documents live in two merged roots (repo-local `./brain/` overrides global `~/.config/ponytail/brain` or `config.json` `brainDir` when `<folder>/<file>.md` matches):

- `rules/` — Mandatory coding constraints (`when: always` is injected in full upfront; a specific `when` is loaded when the plan matches).
- `patterns/` — Implementation patterns and idioms.
- `architecture/` — System and module boundaries.
- `snippets/` — Reusable code templates.
- `configs/` — Specific tool or environment configurations.

Every `.md` file **must** begin with YAML frontmatter containing `title`, `tags`, and `when`:

```markdown
---
title: Concise document title
tags: comma, separated, keywords
when: Specific condition when this knowledge or rule applies (or "always" for global rules)
---

Concise rule, pattern, architecture, snippet, or config content.
```

## Actions

- **Init (`init [--global]`)**: Create the 5 folders (`rules`, `patterns`, `architecture`, `snippets`, `configs`) in `./brain/` (or the global Brain directory with `--global`).
- **List (`list`)**: Inspect indexed documents and any skipped files missing `title`, `tags`, or `when`.
- **Save / Capture**: When asked to save knowledge from the current session into the Brain, pick the right folder (`rules`, `patterns`, `architecture`, `snippets`, or `configs`), write a concise `.md` file with required `title`, `tags`, and `when` frontmatter into `./brain/<folder>/<slug>.md` (or global Brain if requested), and confirm the saved path in one line.
