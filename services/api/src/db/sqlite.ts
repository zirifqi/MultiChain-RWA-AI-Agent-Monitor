import Database from "better-sqlite3";
import { openSqlite } from "../../../../infra/sqlite/open";

export function createDb(path: string): Database.Database {
  return openSqlite(path);
}
