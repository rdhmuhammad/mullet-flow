#!/usr/bin/env node
// ponytail — Brain repository indexer and manager for max / ultra-max modes.
//
// Scans the 5 strict Brain folders (rules, patterns, architecture, snippets, configs)
// across the global Brain directory and optional repo-local ./brain/ override.
// Every indexed .md file must declare YAML frontmatter with title, tags, and when.
//
// shortcut: flat YAML frontmatter keys only, upgrade to a full YAML parser if multi-line nested metadata is needed.

const fs = require('fs');
const path = require('path');
const { getBrainDir, getLocalBrainDir, writeBrainDir } = require('./ponytail-config');

const BRAIN_FOLDERS = ['rules', 'patterns', 'architecture', 'snippets', 'configs'];
const REQUIRED_FIELDS = ['title', 'tags', 'when'];

function parseBrainDoc(content) {
  const match = String(content || '').replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---[^\S\n]*\r?\n?([\s\S]*)$/);
  if (!match) return { valid: false, missing: REQUIRED_FIELDS };

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].trim().toLowerCase();
    const val = kv[2].trim().replace(/^["']|["']$/g, '').replace(/^\[|\]$/g, '').trim();
    if (val) fields[key] = val;
  }

  const missing = REQUIRED_FIELDS.filter((k) => !fields[k]);
  if (missing.length) return { valid: false, missing };

  const whenNorm = fields.when.toLowerCase();
  return {
    valid: true,
    title: fields.title,
    tags: fields.tags,
    when: fields.when,
    always: whenNorm === 'always' || whenNorm === '*',
    body: match[2].trim(),
  };
}

function scanBrain(cwd = process.cwd()) {
  const globalDir = getBrainDir();
  const localDir = getLocalBrainDir(cwd);
  const sources = [{ scope: 'global', dir: globalDir }];
  if (path.resolve(localDir) !== path.resolve(globalDir)) {
    sources.push({ scope: 'local', dir: localDir });
  }

  const docs = new Map();
  const invalid = [];

  for (const { scope, dir } of sources) {
    if (!fs.existsSync(dir)) continue;
    for (const folder of BRAIN_FOLDERS) {
      const folderPath = path.join(dir, folder);
      if (!fs.existsSync(folderPath)) continue;
      let entries = [];
      try {
        entries = fs.readdirSync(folderPath, { withFileTypes: true });
      } catch (_) {
        continue;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const ent of entries) {
        if (!ent.isFile() || !ent.name.endsWith('.md')) continue;
        const rel = `${folder}/${ent.name}`;
        const filePath = path.join(folderPath, ent.name);
        let raw = '';
        try {
          raw = fs.readFileSync(filePath, 'utf8');
        } catch (_) {
          continue;
        }
        const parsed = parseBrainDoc(raw);
        if (!parsed.valid) {
          invalid.push({ rel, filePath, scope, missing: parsed.missing });
          continue;
        }
        docs.set(rel, {
          rel,
          folder,
          filePath,
          scope,
          title: parsed.title,
          tags: parsed.tags,
          when: parsed.when,
          always: folder === 'rules' && parsed.always,
          body: parsed.body,
        });
      }
    }
  }

  return {
    globalDir,
    localDir,
    docs: [...docs.values()],
    invalid,
  };
}

function buildBrainContext(cwd = process.cwd()) {
  const { docs } = scanBrain(cwd);
  const alwaysRules = docs.filter((d) => d.folder === 'rules' && d.always);
  const indexedDocs = docs.filter((d) => !(d.folder === 'rules' && d.always));

  const lines = [
    '## Brain Workflow',
    '',
    '1. Understand the plan first. Before writing code, check the Brain Index below against your plan (`tags` and `when`).',
    '2. Grab specific knowledge: read every matching `.md` file from the Brain Index (including conditional `rules/`) before writing code.',
    '3. Enforce Brain rules: `rules/` and matched Brain patterns/architecture/configs take precedence over generic YAGNI rules when they conflict.',
    '4. End your reply with `Brain applied: <comma-separated folder/file.md list, or none>` right before the skipped/risk line.',
  ];

  if (alwaysRules.length) {
    lines.push('', '## Enforced Brain Rules (Always Active)');
    for (const r of alwaysRules) {
      lines.push('', `### [${r.rel}] ${r.title}`, r.body);
    }
  }

  lines.push('', '## Brain Index (Read matching files after understanding the plan)');
  if (indexedDocs.length) {
    for (const d of indexedDocs) {
      lines.push(`- ${d.rel} (path: ${d.filePath}) — ${d.title} | tags: ${d.tags} | when: ${d.when}`);
    }
  } else {
    lines.push('(No indexed Brain documents found. Run `/ponytail brain init` and add `.md` files with `title`, `tags`, and `when` frontmatter.)');
  }

  return lines.join('\n');
}

function initBrain(targetDir = getLocalBrainDir()) {
  const resolved = path.resolve(targetDir);
  for (const folder of BRAIN_FOLDERS) {
    fs.mkdirSync(path.join(resolved, folder), { recursive: true });
  }
  return resolved;
}

function formatBrainList(cwd = process.cwd()) {
  const { globalDir, localDir, docs, invalid } = scanBrain(cwd);
  const out = [
    `PONYTAIL BRAIN — global: ${globalDir} | local: ${localDir}`,
    `Indexed documents (${docs.length}):`,
  ];
  if (!docs.length) {
    out.push('  (none)');
  } else {
    for (const d of docs) {
      out.push(`  - ${d.rel} [${d.scope}] — ${d.title} (tags: ${d.tags} | when: ${d.when})`);
    }
  }
  if (invalid.length) {
    out.push(`Skipped invalid documents (${invalid.length}):`);
    for (const inv of invalid) {
      out.push(`  - ${inv.rel} [${inv.scope}] — missing frontmatter: ${inv.missing.join(', ')}`);
    }
  }
  return out.join('\n');
}

function handleBrainSubcommand(args, cwd = process.cwd()) {
  const parts = String(args || '').trim().split(/\s+/).filter(Boolean);
  const sub = (parts[0] || 'list').toLowerCase();

  if (sub === 'init') {
    const target = parts[1] === '--global' || parts[1] === 'global'
      ? getBrainDir()
      : (parts[1] ? path.resolve(cwd, parts[1]) : getLocalBrainDir(cwd));
    const dir = initBrain(target);
    return `PONYTAIL BRAIN INITIALIZED — created ${BRAIN_FOLDERS.join(', ')} in ${dir}. Add .md files with YAML frontmatter (title, tags, when).`;
  }

  if (sub === 'path') {
    const newPath = parts.slice(1).join(' ');
    if (!newPath) {
      return `PONYTAIL BRAIN PATH — global: ${getBrainDir()} | local: ${getLocalBrainDir(cwd)}`;
    }
    const saved = writeBrainDir(newPath);
    return `PONYTAIL BRAIN PATH SET — global brainDir set to ${saved}.`;
  }

  return formatBrainList(cwd);
}

module.exports = {
  BRAIN_FOLDERS,
  REQUIRED_FIELDS,
  buildBrainContext,
  formatBrainList,
  handleBrainSubcommand,
  initBrain,
  parseBrainDoc,
  scanBrain,
};

if (require.main === module) {
  process.stdout.write(handleBrainSubcommand(process.argv.slice(2).join(' '), process.cwd()) + '\n');
}
