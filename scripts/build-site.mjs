import { mkdirSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Buildless static site: assemble only the files the browser needs into _site/.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const f of ['index.html', 'main.js', 'styles.css']) {
  cpSync(join(root, f), join(out, f));
}
cpSync(join(root, 'data'), join(out, 'data'), { recursive: true });
mkdirSync(join(out, 'src', 'filter'), { recursive: true });
cpSync(join(root, 'src', 'filter'), join(out, 'src', 'filter'), {
  recursive: true,
});

console.log(`built ${out}`);