import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function createDatabase() {
  const db = await openDatabaseAsync("juicecolored-offline.db", { enableChangeListener: true });
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS restaurant_reviews (
      local_id TEXT PRIMARY KEY NOT NULL,
      server_id TEXT UNIQUE,
      client_revision INTEGER NOT NULL,
      client_created_at INTEGER NOT NULL,
      server_updated_at INTEGER,
      restaurant_name TEXT NOT NULL,
      address TEXT,
      lat REAL,
      lng REAL,
      review TEXT NOT NULL,
      deleted_at INTEGER,
      sync_state TEXT NOT NULL,
      last_sync_error TEXT
    );

    CREATE TABLE IF NOT EXISTS food (
      local_id TEXT PRIMARY KEY NOT NULL,
      server_id TEXT UNIQUE,
      client_revision INTEGER NOT NULL,
      client_created_at INTEGER NOT NULL,
      server_updated_at INTEGER,
      local_uri TEXT,
      local_size INTEGER,
      remote_url TEXT,
      image_provider_id TEXT,
      restaurant_local_id TEXT REFERENCES restaurant_reviews(local_id) ON DELETE SET NULL,
      deleted_at INTEGER,
      sync_state TEXT NOT NULL,
      last_sync_error TEXT
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY NOT NULL,
      job_type TEXT NOT NULL,
      entity_local_id TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL,
      last_error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(job_type, entity_local_id)
    );

    CREATE INDEX IF NOT EXISTS restaurant_reviews_by_deleted_at
      ON restaurant_reviews(deleted_at, client_created_at DESC);
    CREATE INDEX IF NOT EXISTS food_by_deleted_at
      ON food(deleted_at, client_created_at DESC);
    CREATE INDEX IF NOT EXISTS outbox_by_due_at
      ON outbox(next_attempt_at, created_at);
  `);

  await db.execAsync(`
    UPDATE restaurant_reviews SET sync_state = 'pending'
      WHERE sync_state = 'syncing'
      AND EXISTS (
        SELECT 1 FROM outbox WHERE outbox.entity_local_id = restaurant_reviews.local_id
      );
    UPDATE food SET sync_state = 'pending'
      WHERE sync_state = 'syncing'
      AND EXISTS (SELECT 1 FROM outbox WHERE outbox.entity_local_id = food.local_id);

    UPDATE restaurant_reviews SET sync_state = 'synced', last_sync_error = NULL
      WHERE server_id IS NOT NULL
      AND sync_state IN ('pending', 'syncing')
      AND NOT EXISTS (
        SELECT 1 FROM outbox WHERE outbox.entity_local_id = restaurant_reviews.local_id
      );
    UPDATE food SET sync_state = 'synced', last_sync_error = NULL
      WHERE server_id IS NOT NULL
      AND sync_state IN ('pending', 'syncing')
      AND NOT EXISTS (SELECT 1 FROM outbox WHERE outbox.entity_local_id = food.local_id);
  `);
  return db;
}

export function getDatabase() {
  databasePromise ??= createDatabase();
  return databasePromise;
}
