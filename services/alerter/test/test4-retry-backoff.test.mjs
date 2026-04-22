import test from 'node:test';
import assert from 'node:assert/strict';

function computeBackoffSeconds(attempts) {
  return Math.min(300, Math.max(10, attempts * 10));
}

test('test-4 retry backoff: failure backoff grows and is capped', () => {
  assert.equal(computeBackoffSeconds(1), 10, 'attempt 1 -> 10s');
  assert.equal(computeBackoffSeconds(2), 20, 'attempt 2 -> 20s');
  assert.equal(computeBackoffSeconds(5), 50, 'attempt 5 -> 50s');
  assert.equal(computeBackoffSeconds(30), 300, 'attempt 30 -> capped at 300s');
  assert.equal(computeBackoffSeconds(999), 300, 'large attempts stay capped at 300s');
});
