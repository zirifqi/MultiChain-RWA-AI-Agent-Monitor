import test from 'node:test';
import assert from 'node:assert/strict';

function meetsSeverityThreshold(severity, riskScore, thresholds) {
  return riskScore >= thresholds[severity];
}

test('test-1 threshold gating: sends only when risk score meets severity threshold', () => {
  const thresholds = {
    info: 95,
    warning: 60,
    critical: 75
  };

  assert.equal(meetsSeverityThreshold('warning', 59.9, thresholds), false);
  assert.equal(meetsSeverityThreshold('warning', 60, thresholds), true);

  assert.equal(meetsSeverityThreshold('critical', 74.99, thresholds), false);
  assert.equal(meetsSeverityThreshold('critical', 75, thresholds), true);

  assert.equal(meetsSeverityThreshold('info', 94, thresholds), false);
  assert.equal(meetsSeverityThreshold('info', 96, thresholds), true);
});
