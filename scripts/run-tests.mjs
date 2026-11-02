import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Run every tests/*.test.js in its own node process with inherited stdio.
// Child processes must use stdio 'inherit' (not a pipe): the DSH Windows
// sandbox denies named-pipe captures.
const testsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../tests');
const files = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [resolve(testsDir, f)], {
    stdio: 'inherit',
  });
  if (r.status !== 0) failed = 1;
}
process.exit(failed);