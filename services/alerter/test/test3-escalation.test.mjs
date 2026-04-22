import test from 'node:test';
import assert from 'node:assert/strict';

function isEscalated({ recentSameTypeCount, escalationRepeatCount }) {
  return recentSameTypeCount + 1 >= escalationRepeatCount;
}

test('test-3 escalation: repeated incidents trigger escalation at threshold', () => {
  assert.equal(
    isEscalated({ recentSameTypeCount: 0, escalationRepeatCount: 3 }),
    false,
    'first incident should not escalate'
  );

  assert.equal(
    isEscalated({ recentSameTypeCount: 1, escalationRepeatCount: 3 }),
    false,
    'second incident should not escalate yet'
  );

  assert.equal(
    isEscalated({ recentSameTypeCount: 2, escalationRepeatCount: 3 }),
    true,
    'third incident should escalate'
  );

  assert.equal(
    isEscalated({ recentSameTypeCount: 4, escalationRepeatCount: 3 }),
    true,
    'incident above threshold stays escalated'
  );
});
