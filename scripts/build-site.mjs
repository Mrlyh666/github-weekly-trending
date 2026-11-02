import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (root, p) => readFileSync(join(root, p), 'utf8');

// Collapse the ES modules into one script body: drop import/export keywords so
// the three files can run as a single inline <script type="module">.
const strip = (src) =>
  src.replace(/^export\s+/gm, '').replace(/^import\s+.*?;\s*$/gm, '');

/**
 * Assemble a self-contained _site/index.html: stylesheet, application code and
 * the latest week's data are all inlined, so the first paint costs one request
 * instead of a chain of html -> js -> modules -> index.json -> week.json.
 */
export function build({ root, out }) {
  const bundle = [
    read(root, 'src/filter/week-resolution.js'),
    read(root, 'src/filter/index.js'),
    read(root, 'main.js'),
  ]
    .map(strip)
    .join('\n');

  const css = read(root, 'styles.css');

  const index = JSON.parse(read(root, 'data/weeks/index.json'));
  let bootJson = '';
  if (index.latest) {
    const week = JSON.parse(read(root, `data/weeks/${index.latest}.json`));
    bootJson = JSON.stringify({ index, week }).replace(/</g, '\\u003c');
  }

  let html = read(root, 'index.html');
  html = html.replace(
    '<link rel="stylesheet" href="./styles.css" />',
    `<style>\n${css}\n    </style>`,
  );
  html = html.replace(
    '<script type="module" src="./main.js"></script>',
    `${
      bootJson
        ? `<script type="application/json" id="boot-data">${bootJson}</script>\n    `
        : ''
    }<script type="module">\n${bundle}\n    </script>`,
  );

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), html);
  // Older weeks stay on disk and are fetched on demand by the week selector.
  cpSync(join(root, 'data'), join(out, 'data'), { recursive: true });
  // Keep the plain assets too: a browser holding a cached pre-inline index.html
  // still references them, and the fetch-based fallback path must keep working.
  for (const f of ['main.js', 'styles.css']) cpSync(join(root, f), join(out, f));
  mkdirSync(join(out, 'src', 'filter'), { recursive: true });
  cpSync(join(root, 'src', 'filter'), join(out, 'src', 'filter'), {
    recursive: true,
  });

  return { html, bytes: Buffer.byteLength(html) };
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, '..');
  const { bytes } = build({ root, out: join(root, '_site') });
  console.log(`built ${join(root, '_site')} (index.html ${bytes} bytes)`);
}