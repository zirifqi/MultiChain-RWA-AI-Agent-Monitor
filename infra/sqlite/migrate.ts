import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

type MigrationLogger = Pick<Console, "log">;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = path.resolve(currentDir, "../migrations/sqlite");

export interface MigrationStatusItem {
  name: string;
  applied: boolean;
  appliedAt?: string;
}

function getMigrationFiles(migrationsDir: string): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

function ensureMigrationTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

function getAppliedMap(db: Database.Database): Map<string, string> {
  const rows = db
    .prepare("SELECT name, applied_at FROM schema_migrations ORDER BY applied_at ASC")
    .all() as Array<{ name: string; applied_at: string }>;

  return new Map(rows.map((r) => [r.name, r.applied_at]));
}

function hasAppliedMigration(db: Database.Database, name: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM schema_migrations WHERE name = ? LIMIT 1")
    .get(name);

  return Boolean(row);
}

export function getMigrationStatus(
  db: Database.Database,
  options?: {
    migrationsDir?: string;
  }
): MigrationStatusItem[] {
  const migrationsDir = options?.migrationsDir ?? defaultMigrationsDir;
  ensureMigrationTable(db);

  const files = getMigrationFiles(migrationsDir);
  const appliedMap = getAppliedMap(db);

  return files.map((name) => ({
    name,
    applied: appliedMap.has(name),
    appliedAt: appliedMap.get(name)
  }));
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

  ensureMigrationTable(db);

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
