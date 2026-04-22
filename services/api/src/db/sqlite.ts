import Database from "better-sqlite3";
import { migrateDatabase } from "../../../../infra/sqlite/migrate";

export function createDb(path: string): Database.Database {
  const db = new Database(path, { readonly: false });
  migrateDatabase(db, { logger: console });
  return db;
}
