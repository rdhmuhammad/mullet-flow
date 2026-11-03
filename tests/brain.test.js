#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { getBrainDir, writeBrainDir } = require('../hooks/ponytail-config');
const {
  BRAIN_FOLDERS,
  buildBrainContext,
  handleBrainSubcommand,
  initBrain,
  parseBrainDoc,
  scanBrain,
} = require('../hooks/ponytail-brain');
const { getPonytailInstructions } = require('../hooks/ponytail-instructions');

const root = path.join(__dirname, '..');

function withBrainEnv(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-brain-'));
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const prevBrain = process.env.PONYTAIL_BRAIN_DIR;
  process.env.XDG_CONFIG_HOME = path.join(tmp, 'xdg');
  delete process.env.PONYTAIL_BRAIN_DIR;

  try {
    return fn(tmp);
  } finally {
    if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = prevXdg;
    if (prevBrain === undefined) delete process.env.PONYTAIL_BRAIN_DIR;
    else process.env.PONYTAIL_BRAIN_DIR = prevBrain;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('parseBrainDoc enforces required title, tags, and when frontmatter', () => {
  const validAlways = parseBrainDoc('---\ntitle: Always Rule\ntags: [sec, auth]\nwhen: always\n---\nNever log tokens.');
  assert.equal(validAlways.valid, true);
  assert.equal(validAlways.title, 'Always Rule');
  assert.equal(validAlways.tags, 'sec, auth');
  assert.equal(validAlways.always, true);
  assert.equal(validAlways.body, 'Never log tokens.');

  const missingWhen = parseBrainDoc('---\ntitle: Partial\ntags: api\n---\nBody');
  assert.equal(missingWhen.valid, false);
  assert.deepEqual(missingWhen.missing, ['when']);

  const noFrontmatter = parseBrainDoc('# Just a heading\nBody');
  assert.equal(noFrontmatter.valid, false);
  assert.deepEqual(noFrontmatter.missing, ['title', 'tags', 'when']);
});

test('scanBrain scans only the 5 strict folders and merges global + local with local override', () => withBrainEnv((tmp) => {
  const globalBrain = path.join(tmp, 'global-brain');
  const workspace = path.join(tmp, 'workspace');
  const localBrain = path.join(workspace, 'brain');

  initBrain(globalBrain);
  initBrain(localBrain);
  writeBrainDir(globalBrain);
  assert.equal(getBrainDir(), globalBrain);

  // Global rule + global pattern
  fs.writeFileSync(
    path.join(globalBrain, 'rules', 'security.md'),
    '---\ntitle: Global Security\ntags: security\nwhen: always\n---\nGlobal rule body.',
  );
  fs.writeFileSync(
    path.join(globalBrain, 'patterns', 'repo.md'),
    '---\ntitle: Global Repo Pattern\ntags: db, repo\nwhen: database queries\n---\nUse global repo.',
  );

  // Local overrides patterns/repo.md, adds configs/tsconfig.md, and has one invalid doc + one ignored folder
  fs.writeFileSync(
    path.join(localBrain, 'patterns', 'repo.md'),
    '---\ntitle: Local Repo Override\ntags: db, prisma\nwhen: prisma queries\n---\nUse local prisma.',
  );
  fs.writeFileSync(
    path.join(localBrain, 'configs', 'tsconfig.md'),
    '---\ntitle: Strict TS Config\ntags: ts, config\nwhen: initializing tsconfig\n---\n{"strict": true}',
  );
  fs.writeFileSync(
    path.join(localBrain, 'snippets', 'broken.md'),
    '---\ntitle: Missing Tags and When\n---\nBroken snippet.',
  );
  fs.mkdirSync(path.join(localBrain, 'random-folder'), { recursive: true });
  fs.writeFileSync(
    path.join(localBrain, 'random-folder', 'ignored.md'),
    '---\ntitle: Ignored\ntags: x\nwhen: always\n---\nIgnored.',
  );

  const scanned = scanBrain(workspace);
  assert.deepEqual(
    scanned.docs.map((d) => `${d.rel}:${d.scope}:${d.title}`).sort(),
    [
      'configs/tsconfig.md:local:Strict TS Config',
      'patterns/repo.md:local:Local Repo Override',
      'rules/security.md:global:Global Security',
    ],
  );
  assert.equal(scanned.invalid.length, 1);
  assert.equal(scanned.invalid[0].rel, 'snippets/broken.md');
  assert.deepEqual(scanned.invalid[0].missing, ['tags', 'when']);
}));

test('buildBrainContext injects unconditional rules in full and indexes conditional rules + docs', () => withBrainEnv((tmp) => {
  const workspace = path.join(tmp, 'workspace');
  const localBrain = initBrain(path.join(workspace, 'brain'));

  fs.writeFileSync(
    path.join(localBrain, 'rules', 'always-validate.md'),
    '---\ntitle: Boundary Validation\ntags: validation, input\nwhen: always\n---\nValidate every external payload at the boundary.',
  );
  fs.writeFileSync(
    path.join(localBrain, 'rules', 'sql-tx.md'),
    '---\ntitle: SQL Transactions\ntags: sql, db\nwhen: multi-table writes\n---\nWrap multi-table writes in a transaction.',
  );
  fs.writeFileSync(
    path.join(localBrain, 'architecture', 'hexagonal.md'),
    '---\ntitle: Ports and Adapters\ntags: arch, ports\nwhen: adding new service modules\n---\nKeep domain pure.',
  );

  const ctx = buildBrainContext(workspace);
  assert.match(ctx, /## Enforced Brain Rules \(Always Active\)/);
  assert.match(ctx, /### \[rules\/always-validate\.md\] Boundary Validation/);
  assert.match(ctx, /Validate every external payload at the boundary\./);
  assert.doesNotMatch(ctx, /Wrap multi-table writes in a transaction\./, 'conditional rule body must stay out of upfront injection');
  assert.match(ctx, /## Brain Index/);
  assert.match(ctx, /- rules\/sql-tx\.md \(path: .*sql-tx\.md\) — SQL Transactions \| tags: sql, db \| when: multi-table writes/);
  assert.match(ctx, /- architecture\/hexagonal\.md \(path: .*hexagonal\.md\) — Ports and Adapters \| tags: arch, ports \| when: adding new service modules/);
  assert.match(ctx, /Brain applied:/);
}));

test('getPonytailInstructions includes Brain context in max and ultra-max modes', () => withBrainEnv((tmp) => {
  const workspace = path.join(tmp, 'workspace');
  const localBrain = initBrain(path.join(workspace, 'brain'));
  fs.writeFileSync(
    path.join(localBrain, 'rules', 'strict-err.md'),
    '---\ntitle: Explicit Error Handling\ntags: errors\nwhen: always\n---\nNever swallow errors.',
  );

  const maxOut = getPonytailInstructions('max', workspace);
  assert.match(maxOut, /^PONYTAIL MODE ACTIVE — level: max/);
  assert.match(maxOut, /\|\s*\*\*max\*\*\s*\|/);
  assert.doesNotMatch(maxOut, /\|\s*\*\*lite\*\*\s*\|/);
  assert.match(maxOut, /### \[rules\/strict-err\.md\] Explicit Error Handling/);

  const ultraMaxOut = getPonytailInstructions('ultra-max', workspace);
  assert.match(ultraMaxOut, /^PONYTAIL MODE ACTIVE — level: ultra-max/);
  assert.match(ultraMaxOut, /\|\s*\*\*ultra-max\*\*\s*\|/);
  assert.match(ultraMaxOut, /also question the request and push back/i);
  assert.match(ultraMaxOut, /### \[rules\/strict-err\.md\] Explicit Error Handling/);
}));

test('handleBrainSubcommand and mode-tracker handle /ponytail brain and /ponytail max|ultra-max', () => withBrainEnv((tmp) => {
  const workspace = path.join(tmp, 'workspace');
  fs.mkdirSync(workspace, { recursive: true });

  const initMsg = handleBrainSubcommand('init', workspace);
  assert.match(initMsg, /PONYTAIL BRAIN INITIALIZED/);
  for (const f of BRAIN_FOLDERS) {
    assert.ok(fs.existsSync(path.join(workspace, 'brain', f)), `expected folder ${f}`);
  }

  const listMsg = handleBrainSubcommand('list', workspace);
  assert.match(listMsg, /Indexed documents \(0\):/);

  // Mode tracker hook test for /ponytail max, /ponytail ultra-max, and /ponytail brain list
  const claudeDir = path.join(tmp, 'claude');
  const env = {
    ...process.env,
    CLAUDE_CONFIG_DIR: claudeDir,
    CLAUDE_PROJECT_DIR: '',
    PLUGIN_DATA: '',
    COPILOT_PLUGIN_DATA: '',
    CURSOR_VERSION: '',
    QODER_SESSION_ID: '',
  };

  const switchMax = spawnSync(process.execPath, [path.join(root, 'hooks', 'ponytail-mode-tracker.js')], {
    cwd: workspace,
    env,
    input: JSON.stringify({ prompt: '/ponytail ultra-max' }),
    encoding: 'utf8',
  });
  assert.equal(switchMax.status, 0, switchMax.stderr);
  assert.match(switchMax.stdout, /^PONYTAIL MODE CHANGED — level: ultra-max/);
  assert.match(switchMax.stdout, /## Brain Workflow/);
  assert.equal(fs.readFileSync(path.join(claudeDir, '.ponytail-active'), 'utf8'), 'ultra-max');

  const brainCmd = spawnSync(process.execPath, [path.join(root, 'hooks', 'ponytail-mode-tracker.js')], {
    cwd: workspace,
    env,
    input: JSON.stringify({ prompt: '/ponytail brain list' }),
    encoding: 'utf8',
  });
  assert.equal(brainCmd.status, 0, brainCmd.stderr);
  assert.match(brainCmd.stdout, /PONYTAIL BRAIN — global:/);
}));


test('scanBrain supports nested subfolders, tag inheritance, and local overrides', () => withBrainEnv((tmp) => {
  const globalBrain = path.join(tmp, 'global-brain');
  const workspace = path.join(tmp, 'workspace');
  const localBrain = path.join(workspace, 'brain');

  initBrain(globalBrain);
  initBrain(localBrain);
  writeBrainDir(globalBrain);

  // Global nested patterns: patterns/react/state.md, patterns/react/hooks.md, patterns/node/fs.md
  fs.mkdirSync(path.join(globalBrain, 'patterns', 'react'), { recursive: true });
  fs.mkdirSync(path.join(globalBrain, 'patterns', 'node'), { recursive: true });

  fs.writeFileSync(
    path.join(globalBrain, 'patterns', 'react', 'state.md'),
    '---\ntitle: Global React State\ntags: zustand\nwhen: managing state in react\n---\nGlobal zustand pattern.',
  );
  fs.writeFileSync(
    path.join(globalBrain, 'patterns', 'react', 'hooks.md'),
    '---\ntitle: Global React Hooks\ntags: custom-hooks\nwhen: creating react hooks\n---\nGlobal hooks pattern.',
  );
  fs.writeFileSync(
    path.join(globalBrain, 'patterns', 'node', 'fs.md'),
    '---\ntitle: Node FS Operations\ntags: io\nwhen: reading files in node\n---\nUse streams.',
  );

  // Local override: patterns/react/state.md
  fs.mkdirSync(path.join(localBrain, 'patterns', 'react'), { recursive: true });
  fs.writeFileSync(
    path.join(localBrain, 'patterns', 'react', 'state.md'),
    '---\ntitle: Local React State Override\ntags: redux\nwhen: managing state in react\n---\nLocal redux pattern.',
  );

  const scanned = scanBrain(workspace);
  const stateDoc = scanned.docs.find((d) => d.rel === 'patterns/react/state.md');
  const hooksDoc = scanned.docs.find((d) => d.rel === 'patterns/react/hooks.md');
  const nodeDoc = scanned.docs.find((d) => d.rel === 'patterns/node/fs.md');

  assert.ok(stateDoc, 'expected patterns/react/state.md to be indexed');
  assert.equal(stateDoc.scope, 'local', 'expected local override for nested path');
  assert.equal(stateDoc.title, 'Local React State Override');
  assert.match(stateDoc.tags, /react/, 'expected subfolder name to be inherited into tags');

  assert.ok(hooksDoc, 'expected patterns/react/hooks.md to be indexed');
  assert.equal(hooksDoc.scope, 'global');
  assert.match(hooksDoc.tags, /react/, 'expected react tag from subfolder');

  assert.ok(nodeDoc, 'expected patterns/node/fs.md to be indexed');
  assert.match(nodeDoc.tags, /node/, 'expected node tag from subfolder');

  // Test search subcommand
  const searchReact = handleBrainSubcommand('search react', workspace);
  assert.match(searchReact, /query: "react" \(2 matches\)/);
  assert.match(searchReact, /patterns\/react\/state\.md/);
  assert.match(searchReact, /patterns\/react\/hooks\.md/);

  // Test list with folder filter
  const listReact = handleBrainSubcommand('list react', workspace);
  assert.match(listReact, /Indexed documents \(2 matching "react"\)/);
}));

test('buildBrainContext rolls up subfolders when docs exceed budget limit', () => withBrainEnv((tmp) => {
  const globalBrain = path.join(tmp, 'global-brain');
  const workspace = path.join(tmp, 'workspace');
  initBrain(globalBrain);
  writeBrainDir(globalBrain);

  // Create 5 docs in patterns/react/
  const reactDir = path.join(globalBrain, 'patterns', 'react');
  fs.mkdirSync(reactDir, { recursive: true });
  for (let i = 1; i <= 5; i++) {
    fs.writeFileSync(
      path.join(reactDir, `hook-${i}.md`),
      `---\ntitle: React Hook ${i}\ntags: hooks, react\nwhen: hook ${i}\n---\nBody ${i}`,
    );
  }

  // Force low budget limit to trigger rollup
  const prevMaxDocs = process.env.PONYTAIL_BRAIN_MAX_DOCS;
  process.env.PONYTAIL_BRAIN_MAX_DOCS = '2';

  try {
    const ctx = buildBrainContext(workspace);
    assert.match(ctx, /patterns\/react\/\* \(5 docs in .*patterns.react\) — tags:/);
    assert.match(ctx, /Run `\/ponytail brain search <keyword>`/);
  } finally {
    if (prevMaxDocs === undefined) delete process.env.PONYTAIL_BRAIN_MAX_DOCS;
    else process.env.PONYTAIL_BRAIN_MAX_DOCS = prevMaxDocs;
  }
}));
