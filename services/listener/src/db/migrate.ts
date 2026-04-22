import "dotenv/config";
import { getMigrationStatus, migrateDatabase } from "../../../../infra/sqlite/migrate";
import { openSqlite } from "../../../../infra/sqlite/open";

function openDb() {
  const sqlitePath = process.env.SQLITE_PATH ?? "./data/rwa-monitor.db";
  const db = openSqlite(sqlitePath, { migrate: false });
  return { db, sqlitePath };
}

function runMigrate(): void {
  const { db, sqlitePath } = openDb();
  migrateDatabase(db, { logger: console });
  db.close();
  console.log(`[db:migrate] done for ${sqlitePath}`);
}

function runStatus(): void {
  const { db, sqlitePath } = openDb();
  const status = getMigrationStatus(db);
  db.close();

  console.log(`[db:migrate:status] ${sqlitePath}`);
  for (const row of status) {
    const flag = row.applied ? "✅" : "⬜";
    const at = row.appliedAt ? ` @ ${row.appliedAt}` : "";
    console.log(`${flag} ${row.name}${at}`);
  }
}

function main(): void {
  const command = process.argv[2] ?? "up";

  if (command === "up" || command === "migrate") {
    runMigrate();
    return;
  }

  if (command === "status") {
    runStatus();
    return;
  }

  console.log("Usage: tsx src/db/migrate.ts [up|status]");
  process.exit(1);
}

main();
