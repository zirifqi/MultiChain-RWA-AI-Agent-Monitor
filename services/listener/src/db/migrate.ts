import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrateDatabase } from "../../../../infra/sqlite/migrate";

function main(): void {
  const sqlitePath = process.env.SQLITE_PATH ?? "./data/rwa-monitor.db";
  const dir = path.dirname(sqlitePath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(sqlitePath);
  migrateDatabase(db, { logger: console });
  db.close();

  console.log(`[db:migrate] done for ${sqlitePath}`);
}

main();
