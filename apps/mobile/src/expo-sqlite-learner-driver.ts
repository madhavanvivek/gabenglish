import * as SQLite from "expo-sqlite";
import type { LocalKeyValueDriver } from "./learner-local-store";

const DATABASE_NAME = "gabenglish-learner.db";
const TABLE_NAME = "learner_records";

/**
 * SQLite-backed device-local key/value driver.
 *
 * The caller supplies account-scoped opaque keys. SQLite is app-private, but
 * this adapter does not claim SQLCipher encryption; encrypted-at-rest
 * configuration remains a separate release-build security milestone.
 */
export class ExpoSqliteLearnerDriver implements LocalKeyValueDriver {
  private databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

  private database(): Promise<SQLite.SQLiteDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = this.openDatabase().catch((error) => {
        this.databasePromise = null;
        throw error;
      });
    }
    return this.databasePromise;
  }

  private async openDatabase(): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await db.execAsync("PRAGMA busy_timeout = 5000;");
    await db.execAsync(
      "CREATE TABLE IF NOT EXISTS " + TABLE_NAME + " (" +
        "record_key TEXT PRIMARY KEY NOT NULL, " +
        "record_value TEXT NOT NULL, " +
        "updated_at TEXT NOT NULL" +
      ");"
    );
    return db;
  }

  async get(key: string): Promise<string | null> {
    const db = await this.database();
    const row = await db.getFirstAsync<{ record_value: string }>(
      "SELECT record_value FROM " + TABLE_NAME + " WHERE record_key = ?",
      key
    );
    return row?.record_value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.database();
    await db.runAsync(
      "INSERT INTO " + TABLE_NAME + " (record_key, record_value, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(record_key) DO UPDATE SET record_value = excluded.record_value, updated_at = excluded.updated_at",
      key,
      value,
      new Date().toISOString()
    );
  }

  async remove(key: string): Promise<void> {
    const db = await this.database();
    await db.runAsync("DELETE FROM " + TABLE_NAME + " WHERE record_key = ?", key);
  }
}
