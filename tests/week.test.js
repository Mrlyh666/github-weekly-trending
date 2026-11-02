import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoWeek } from '../src/collect/week.js';

test('isoWeek computes ISO 8601 week numbers', () => {
  assert.equal(isoWeek(new Date('2026-11-02T00:00:00Z')), '2026-W45');
});

test('isoWeek puts a Sunday on the boundary into the previous ISO year', () => {
  // 2017-01-01 is a Sunday -> belongs to the last week of 2016.
  assert.equal(isoWeek(new Date('2017-01-01T00:00:00Z')), '2016-W52');
});

test('isoWeek handles a 53-week year boundary', () => {
  // 2021-01-01 is a Friday -> belongs to 2020-W53.
  assert.equal(isoWeek(new Date('2021-01-01T00:00:00Z')), '2020-W53');
});