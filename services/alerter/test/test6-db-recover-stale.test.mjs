import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let Database;
try {
  Database = require('../../listener/node_modules/better-sqlite3');
} catch {
  Database = null;
}

function initDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_outbox (
      event_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_retry_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      decision_code TEXT,
      decision_note TEXT,
      PRIMARY KEY (event_id, channel)
    );
  `);
}

test('test-6 db stale recovery: processing job is requeued for retry', (t) => {
  if (!Database) {
    t.skip('better-sqlite3 native binding unavailable in this environment');
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rwa-alerter-stale-'));
  const dbPath = path.join(tmpDir, 'test.db');

  let db;
  try {
    db = new Database(dbPath);
  } catch {
    t.skip('better-sqlite3 native binary unavailable in this runtime');
    return;
  }
  initDb(db);

  const oldIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO alert_outbox (
        event_id, channel, status, attempts, next_retry_at, created_at, updated_at
      ) VALUES (?, 'telegram', 'processing', 0, ?, ?, ?)
    `
  ).run('event-stale', oldIso, oldIso, oldIso);

  const processingTimeoutSeconds = 120;
  const staleBefore = new Date(Date.now() - processingTimeoutSeconds * 1000).toISOString();

  const result = db.prepare(
    `
      UPDATE alert_outbox
      SET status = 'failed',
          next_retry_at = ?,
          updated_at = ?,
          decision_code = 'requeued_stale_processing',
          decision_note = 'Stale processing lock recovered for retry'
      WHERE channel = 'telegram'
        AND status = 'processing'
        AND updated_at <= ?
    `
  ).run(nowIso, nowIso, staleBefore);

  assert.equal(Number(result.changes), 1, 'stale processing row should be recovered');

  const row = db.prepare(`SELECT status, decision_code, next_retry_at FROM alert_outbox WHERE event_id = 'event-stale'`).get();
  assert.equal(row.status, 'failed');
  assert.equal(row.decision_code, 'requeued_stale_processing');
  assert.equal(row.next_retry_at, nowIso);

  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
