import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeWeek, writeIndex, readPrevWeek } from '../src/collect/store.js';

function tmpDir() {
  return mkdtempSync(join(tmpdir(), 'sdd-store-'));
}

test('writeWeek + writeIndex + readPrevWeek round-trip', () => {
  const dir = tmpDir();
  try {
    const w44 = { week: '2026-W44', projects: [{ repo: 'a/b', stars: 10 }] };
    const w45 = { week: '2026-W45', projects: [{ repo: 'a/b', stars: 13 }] };
    writeWeek(dir, w44);
    writeWeek(dir, w45);
    writeIndex(dir, ['2026-W44', '2026-W45']);
    assert.deepEqual(readPrevWeek(dir, '2026-W45'), w44);
    assert.equal(readPrevWeek(dir, '2026-W44'), null); // first week has none
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readPrevWeek returns null when the index file is missing', () => {
  const dir = tmpDir();
  try {
    assert.equal(readPrevWeek(dir, '2026-W45'), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeIndex sorts weeks and records the latest', () => {
  const dir = tmpDir();
  try {
    writeIndex(dir, ['2026-W45', '2026-W44']);
    const parsed = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
    assert.deepEqual(parsed.weeks, ['2026-W44', '2026-W45']);
    assert.equal(parsed.latest, '2026-W45');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});