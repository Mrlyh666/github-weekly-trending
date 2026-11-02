import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../scripts/build-site.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'weekly-site-'));
  mkdirSync(join(root, 'src', 'filter'), { recursive: true });
  mkdirSync(join(root, 'data', 'weeks'), { recursive: true });

  writeFileSync(
    join(root, 'index.html'),
    '<!doctype html><html><head><link rel="stylesheet" href="./styles.css" /></head><body><main id="list"></main><script type="module" src="./main.js"></script></body></html>',
  );
  writeFileSync(join(root, 'styles.css'), 'body{color:red}');
  writeFileSync(
    join(root, 'main.js'),
    "import { f } from './src/filter/index.js';\nconsole.log(f());\n",
  );
  writeFileSync(join(root, 'src', 'filter', 'index.js'), 'export function f(){return 42;}');
  writeFileSync(
    join(root, 'src', 'filter', 'week-resolution.js'),
    'export function parseQuery(){return {};}',
  );
  writeFileSync(
    join(root, 'data', 'weeks', 'index.json'),
    JSON.stringify({ weeks: ['2026-W45'], latest: '2026-W45' }),
  );
  writeFileSync(
    join(root, 'data', 'weeks', '2026-W45.json'),
    JSON.stringify({ week: '2026-W45', projects: [] }),
  );
  return root;
}

test('build produces a single self-contained html', () => {
  const root = fixture();
  try {
    const { html } = build({ root, out: join(root, '_site') });

    assert.match(html, /<style>[\s\S]*body\{color:red\}[\s\S]*<\/style>/);
    assert.match(html, /id="boot-data"/);
    assert.match(html, /"2026-W45"/);
    // No external assets and no leftover import/export syntax.
    assert.doesNotMatch(html, /src="\.\/main\.js"/);
    assert.doesNotMatch(html, /href="\.\/styles\.css"/);
    assert.doesNotMatch(html, /^\s*import\s/m);
    assert.doesNotMatch(html, /^\s*export\s/m);
    // Data files are still copied for on-demand week switching.
    assert.match(readFileSync(join(root, '_site', 'data', 'weeks', 'index.json'), 'utf8'), /2026-W45/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('build omits boot data when there is no week yet', () => {
  const root = fixture();
  try {
    writeFileSync(
      join(root, 'data', 'weeks', 'index.json'),
      JSON.stringify({ weeks: [], latest: null }),
    );
    const { html } = build({ root, out: join(root, '_site') });
    assert.doesNotMatch(html, /id="boot-data"/);
    assert.match(html, /<script type="module">/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});