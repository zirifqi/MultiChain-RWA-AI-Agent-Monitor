import test from 'node:test';
import assert from 'node:assert/strict';

function shouldSuppressByCooldown({ isDuplicateWithinCooldown, escalated }) {
  return isDuplicateWithinCooldown && !escalated;
}

test('test-2 cooldown dedupe: duplicate alerts are suppressed when not escalated', () => {
  assert.equal(
    shouldSuppressByCooldown({ isDuplicateWithinCooldown: true, escalated: false }),
    true,
    'duplicate within cooldown should be suppressed'
  );

  assert.equal(
    shouldSuppressByCooldown({ isDuplicateWithinCooldown: false, escalated: false }),
    false,
    'non-duplicate should not be suppressed'
  );

  assert.equal(
    shouldSuppressByCooldown({ isDuplicateWithinCooldown: true, escalated: true }),
    false,
    'escalation should override cooldown suppression'
  );
});
