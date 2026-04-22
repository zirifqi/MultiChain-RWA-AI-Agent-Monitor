ALTER TABLE alert_outbox ADD COLUMN decision_code TEXT;
ALTER TABLE alert_outbox ADD COLUMN decision_note TEXT;

CREATE INDEX IF NOT EXISTS idx_alert_outbox_decision_code ON alert_outbox(decision_code);
