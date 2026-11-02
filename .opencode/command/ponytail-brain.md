---
description: "Manage or capture knowledge into the Brain repository (rules, patterns, architecture, snippets, configs)"
---

Manage or capture markdown knowledge into the Ponytail Brain repository. Brain documents live in local `./brain/` or global `~/.config/ponytail/brain` across five strict folders: `rules/`, `architecture/`, `patterns/`, `snippets/`, `configs/`. Every `.md` file requires YAML frontmatter with `title`, `tags`, and `when` (use `when: always` for unconditional rules in `rules/`). For `init`, `list`, or `path`, run or apply the requested Brain action; to save knowledge from this session, write a concise `.md` file with valid `title`, `tags`, and `when` frontmatter in the matching folder and confirm the path in one line.
