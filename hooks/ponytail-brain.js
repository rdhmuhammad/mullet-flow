#!/usr/bin/env node
// ponytail — Brain repository indexer and manager for max / ultra-max modes.
//
// Scans the 5 strict Brain folders (rules, patterns, architecture, snippets, configs)
// across the global Brain directory and optional repo-local ./brain/ override.
// Supports recursive subfolder organization, fast header parsing, and subfolder
// rollup when documents exceed prompt budget limits.
// Every indexed .md file must declare YAML frontmatter with title, tags, and when.
//
// shortcut: flat YAML frontmatter keys only, upgrade to a full YAML parser if multi-line nested metadata is needed.

const fs = require('fs');
const path = require('path');
const { getBrainDir, getLocalBrainDir, writeBrainDir } = require('./ponytail-config');

const BRAIN_FOLDERS = ['rules', 'patterns', 'architecture', 'snippets', 'configs'];
const REQUIRED_FIELDS = ['title', 'tags', 'when'];
const MAX_WALK_DEPTH = 4;
const HEADER_BYTE_LIMIT = 4096;

function getMaxFlatDocs() {
  return Number(process.env.PONYTAIL_BRAIN_MAX_DOCS || 40);
}

function getCharBudget() {
  return Number(process.env.PONYTAIL_BRAIN_CHARS || 4000);
}

function readHeader(filePath, byteLimit = HEADER_BYTE_LIMIT) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(byteLimit);
    const bytesRead = fs.readSync(fd, buf, 0, byteLimit, 0);
    fs.closeSync(fd);
    return buf.toString('utf8', 0, bytesRead);
  } catch (_) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch (_) {}
    }
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (_) {
      return '';
    }
  }
}

function parseBrainDoc(content, options = {}) {
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

  // Inherit subfolder names as tags if not already present
  if (options.subfolderTags && options.subfolderTags.length) {
    const existingTags = (fields.tags || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    const extra = options.subfolderTags.filter((t) => !existingTags.includes(t.toLowerCase()));
    if (extra.length) {
      fields.tags = fields.tags ? `${fields.tags}, ${extra.join(', ')}` : extra.join(', ');
    }
  }

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

function listBrainFiles(folderPath, maxDepth = MAX_WALK_DEPTH) {
  const files = [];
  (function walk(curDir, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try {
      entries = fs.readdirSync(curDir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue; // skip hidden folders (.obsidian, .git)
      const fullPath = path.join(curDir, ent.name);
      if (ent.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  })(folderPath, 1);
  return files;
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

      const filePaths = listBrainFiles(folderPath);
      for (const filePath of filePaths) {
        const rel = path.relative(dir, filePath).replace(/\\/g, '/');
        const relParts = path.dirname(rel).split('/').slice(1); // subfolders inside folder

        const rawHeader = readHeader(filePath);
        const parsed = parseBrainDoc(rawHeader, { subfolderTags: relParts });
        if (!parsed.valid) {
          invalid.push({ rel, filePath, scope, missing: parsed.missing });
          continue;
        }

        // For unconditional rules, ensure we have the complete body even if > 4KB
        let body = parsed.body;
        if (folder === 'rules' && parsed.always) {
          try {
            const fullRaw = fs.readFileSync(filePath, 'utf8');
            const fullParsed = parseBrainDoc(fullRaw, { subfolderTags: relParts });
            if (fullParsed.valid) body = fullParsed.body;
          } catch (_) {}
        }

        docs.set(rel, {
          rel,
          folder,
          subfolder: relParts.join('/'),
          filePath,
          scope,
          title: parsed.title,
          tags: parsed.tags,
          when: parsed.when,
          always: folder === 'rules' && parsed.always,
          body,
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
  if (!indexedDocs.length) {
    lines.push('(No indexed Brain documents found. Run `/ponytail brain init` and add `.md` files with `title`, `tags`, and `when` frontmatter.)');
    return lines.join('\n');
  }

  const maxFlatDocs = getMaxFlatDocs();
  const charBudget = getCharBudget();

  // If under budget, list all indexed docs flat
  if (indexedDocs.length <= maxFlatDocs) {
    for (const d of indexedDocs) {
      lines.push(`- ${d.rel} (path: ${d.filePath}) — ${d.title} | tags: ${d.tags} | when: ${d.when}`);
    }
    return lines.join('\n');
  }

  // Over budget: prioritize local project docs flat, roll up global subfolders
  const localDocs = indexedDocs.filter((d) => d.scope === 'local');
  const globalDocs = indexedDocs.filter((d) => d.scope === 'global');

  if (localDocs.length) {
    lines.push('### Local Project Knowledge:');
    for (const d of localDocs) {
      lines.push(`- ${d.rel} (path: ${d.filePath}) — ${d.title} | tags: ${d.tags} | when: ${d.when}`);
    }
    lines.push('', '### Global Knowledge Library:');
  }

  // Group global documents by directory (e.g. patterns/react, patterns, configs)
  const groups = new Map();
  for (const d of globalDocs) {
    const dirKey = path.dirname(d.rel);
    if (!groups.has(dirKey)) groups.set(dirKey, []);
    groups.get(dirKey).push(d);
  }

  let budgetUsed = 0;
  let rolledUpCount = 0;

  for (const [dirKey, groupDocs] of groups) {
    // If a group has 3 or more documents, roll it up into a single folder line
    if (groupDocs.length >= 3) {
      const allTags = [...new Set(groupDocs.flatMap((d) => d.tags.split(',').map((t) => t.trim())).filter(Boolean))];
      const tagsSummary = allTags.slice(0, 8).join(', ') + (allTags.length > 8 ? ', ...' : '');
      const groupDir = path.dirname(groupDocs[0].filePath);
      const line = `- ${dirKey}/* (${groupDocs.length} docs in ${groupDir}) — tags: ${tagsSummary}`;

      if (budgetUsed + line.length > charBudget) {
        rolledUpCount += groupDocs.length;
        continue;
      }
      lines.push(line);
      budgetUsed += line.length + 1;
    } else {
      // Small group or individual docs
      for (const d of groupDocs) {
        const line = `- ${d.rel} (path: ${d.filePath}) — ${d.title} | tags: ${d.tags} | when: ${d.when}`;
        if (budgetUsed + line.length > charBudget) {
          rolledUpCount++;
          continue;
        }
        lines.push(line);
        budgetUsed += line.length + 1;
      }
    }
  }

  if (rolledUpCount > 0) {
    lines.push(`(${rolledUpCount} more documents omitted; use \`/ponytail brain search <term>\` or inspect folder)`);
  }

  lines.push('', '*(Tip: Run `/ponytail brain search <keyword>` to find specific documents across rolled-up subfolders)*');
  return lines.join('\n');
}

function initBrain(targetDir = getLocalBrainDir()) {
  const resolved = path.resolve(targetDir);
  for (const folder of BRAIN_FOLDERS) {
    fs.mkdirSync(path.join(resolved, folder), { recursive: true });
  }
  return resolved;
}

function formatBrainList(cwd = process.cwd(), filterArg = '') {
  const { globalDir, localDir, docs, invalid } = scanBrain(cwd);
  const filter = filterArg.trim().toLowerCase();

  const filteredDocs = filter
    ? docs.filter((d) => d.rel.toLowerCase().includes(filter) || d.title.toLowerCase().includes(filter) || d.tags.toLowerCase().includes(filter))
    : docs;

  const out = [
    `PONYTAIL BRAIN — global: ${globalDir} | local: ${localDir}`,
    `Indexed documents (${filteredDocs.length}${filter ? ` matching "${filter}"` : ''}):`,
  ];

  if (!filteredDocs.length) {
    out.push('  (none)');
  } else {
    for (const d of filteredDocs) {
      out.push(`  - ${d.rel} [${d.scope}] — ${d.title} (tags: ${d.tags} | when: ${d.when})`);
    }
  }

  if (invalid.length) {
    const filteredInvalid = filter
      ? invalid.filter((inv) => inv.rel.toLowerCase().includes(filter))
      : invalid;
    if (filteredInvalid.length) {
      out.push(`Skipped invalid documents (${filteredInvalid.length}):`);
      for (const inv of filteredInvalid) {
        out.push(`  - ${inv.rel} [${inv.scope}] — missing frontmatter: ${inv.missing.join(', ')}`);
      }
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
    return `PONYTAIL BRAIN INITIALIZED — created ${BRAIN_FOLDERS.join(', ')} in ${dir}. Add .md files with YAML frontmatter (title, tags, when). Subfolders are supported.`;
  }

  if (sub === 'path') {
    const newPath = parts.slice(1).join(' ');
    if (!newPath) {
      return `PONYTAIL BRAIN PATH — global: ${getBrainDir()} | local: ${getLocalBrainDir(cwd)}`;
    }
    const saved = writeBrainDir(newPath);
    return `PONYTAIL BRAIN PATH SET — global brainDir set to ${saved}.`;
  }

  if (sub === 'search') {
    const query = parts.slice(1).join(' ').trim().toLowerCase();
    if (!query) {
      return 'PONYTAIL BRAIN SEARCH — specify a search keyword: `/ponytail brain search <term>`';
    }
    const { docs } = scanBrain(cwd);
    const matches = docs.filter((d) =>
      d.rel.toLowerCase().includes(query) ||
      d.title.toLowerCase().includes(query) ||
      d.tags.toLowerCase().includes(query) ||
      d.when.toLowerCase().includes(query)
    );
    if (!matches.length) {
      return `PONYTAIL BRAIN SEARCH — no documents matched "${query}".`;
    }
    const lines = [
      `PONYTAIL BRAIN SEARCH — query: "${query}" (${matches.length} matches):`,
    ];
    for (const m of matches) {
      lines.push(`  - ${m.rel} [${m.scope}] — ${m.title} (tags: ${m.tags} | when: ${m.when})`);
    }
    return lines.join('\n');
  }

  if (sub === 'list') {
    const filterArg = parts.slice(1).join(' ');
    return formatBrainList(cwd, filterArg);
  }

  return formatBrainList(cwd);
}

module.exports = {
  BRAIN_FOLDERS,
  REQUIRED_FIELDS,
  MAX_WALK_DEPTH,
  getMaxFlatDocs,
  getCharBudget,
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
