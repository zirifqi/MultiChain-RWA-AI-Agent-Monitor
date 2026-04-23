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

test('test-5 db race: two workers claim same job, only one succeeds', (t) => {
  if (!Database) {
    t.skip('better-sqlite3 native binding unavailable in this environment');
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rwa-alerter-race-'));
  const dbPath = path.join(tmpDir, 'test.db');

  let db1;
  let db2;
  try {
    db1 = new Database(dbPath);
    db2 = new Database(dbPath);
  } catch {
    t.skip('better-sqlite3 native binary unavailable in this runtime');
    return;
  }

  initDb(db1);

  const now = new Date().toISOString();
  db1
    .prepare(
      `
      INSERT INTO alert_outbox (
        event_id, channel, status, attempts, next_retry_at, created_at, updated_at
      ) VALUES (?, 'telegram', 'pending', 0, ?, ?, ?)
    `
    )
    .run('event-1', now, now, now);

  const claimSql = `
    UPDATE alert_outbox
    SET status = 'processing',
        updated_at = ?,
        decision_code = 'dispatching',
        decision_note = 'claimed'
    WHERE event_id = ?
      AND channel = 'telegram'
      AND status IN ('pending', 'failed')
      AND next_retry_at <= ?
  `;

  const claim1 = db1.prepare(claimSql).run(new Date().toISOString(), 'event-1', new Date().toISOString());
  const claim2 = db2.prepare(claimSql).run(new Date().toISOString(), 'event-1', new Date().toISOString());

  assert.equal(Number(claim1.changes), 1, 'first worker must claim');
  assert.equal(Number(claim2.changes), 0, 'second worker must not claim same job');

  const row = db1.prepare(`SELECT status, decision_code FROM alert_outbox WHERE event_id = 'event-1'`).get();
  assert.equal(row.status, 'processing');
  assert.equal(row.decision_code, 'dispatching');

  db1.close();
  db2.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
