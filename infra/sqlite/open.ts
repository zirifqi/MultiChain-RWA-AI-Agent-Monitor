import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrateDatabase } from "./migrate";

export function openSqlite(filePath: string, options?: { readonly?: boolean; migrate?: boolean }): Database.Database {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(filePath, { readonly: options?.readonly ?? false });

  if (options?.migrate !== false) {
    migrateDatabase(db, { logger: console });
  }

  return db;
}
