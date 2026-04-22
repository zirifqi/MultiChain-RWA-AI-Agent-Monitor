import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

type MigrationLogger = Pick<Console, "log">;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = path.resolve(currentDir, "../migrations/sqlite");

function getMigrationFiles(migrationsDir: string): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

function hasAppliedMigration(db: Database.Database, name: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM schema_migrations WHERE name = ? LIMIT 1")
    .get(name);

  return Boolean(row);
}

export function migrateDatabase(
  db: Database.Database,
  options?: {
    migrationsDir?: string;
    logger?: MigrationLogger;
  }
): void {
  const migrationsDir = options?.migrationsDir ?? defaultMigrationsDir;
  const logger = options?.logger;

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const files = getMigrationFiles(migrationsDir);

  for (const file of files) {
    if (hasAppliedMigration(db, file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

    const tx = db.transaction(() => {
      try {
        db.exec(sql);
      } catch (error: any) {
        const message = String(error?.message ?? error);
        const duplicateColumn = message.includes("duplicate column name");
        if (!duplicateColumn) {
          throw error;
        }
      }

      db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(file, new Date().toISOString());
    });

    tx();
    logger?.log(`[db:migrate] applied ${file}`);
  }
}
