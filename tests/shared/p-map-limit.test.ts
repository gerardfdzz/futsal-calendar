import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pMapLimit } from '../../src/shared/p-map-limit.js';

test('preserves result order even when later items finish first', async () => {
  const delays = [30, 10, 20];
  const results = await pMapLimit(delays, 3, async (delayMs, index) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return index;
  });

  assert.deepEqual(results, [0, 1, 2]);
});

test('never runs more than `concurrency` tasks at the same time', async () => {
  let active = 0;
  let maxActive = 0;

  await pMapLimit([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
  });

  assert.ok(maxActive <= 3, `expected at most 3 concurrent tasks, saw ${maxActive}`);
});

test('handles an empty list without invoking the mapper', async () => {
  let calls = 0;
  const results = await pMapLimit<number, number>([], 4, async (item) => {
    calls++;
    return item;
  });

  assert.deepEqual(results, []);
  assert.equal(calls, 0);
});

test('clamps concurrency down to the number of items', async () => {
  let maxActive = 0;
  let active = 0;

  await pMapLimit([1, 2], 10, async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
  });

  assert.equal(maxActive, 2);
});
