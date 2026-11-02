---
name: ponytail-brain
description: "Manage or capture rules, patterns, architecture, snippets, and configs into the Ponytail Brain repository for max and ultra-max modes."
homepage: https://github.com/DietrichGebert/ponytail
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
