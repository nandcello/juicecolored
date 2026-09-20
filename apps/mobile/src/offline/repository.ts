import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "./db";
import { getRetryOutcome } from "./retry";
import type {
  LocalFood,
  LocalRestaurantReview,
  OutboxJob,
  OutboxJobType,
  RemoteFood,
  RemoteRestaurantReview,
  RestaurantRating,
  SyncState,
} from "./types";

const LOCAL_PHOTO_LIMIT_BYTES = 500 * 1024 * 1024;
const photoDirectory = new Directory(Paths.document, "food-cutouts");

let dataVersion = 0;
const listeners = new Set<() => void>();

type ReviewRow = {
  local_id: string;
  server_id: string | null;
  client_revision: number;
  client_created_at: number;
  restaurant_name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  review: RestaurantRating;
  sync_state: SyncState;
  last_sync_error: string | null;
};

type FoodRow = {
  local_id: string;
  server_id: string | null;
  client_revision: number;
  client_created_at: number;
  local_uri: string | null;
  local_size: number | null;
  remote_url: string | null;
  image_provider_id: string | null;
  restaurant_local_id: string | null;
  sync_state: SyncState;
  last_sync_error: string | null;
};

type OutboxRow = {
  id: string;
  job_type: OutboxJobType;
  entity_local_id: string;
  attempts: number;
  next_attempt_at: number;
};

function notifyDataChanged() {
  dataVersion += 1;
  for (const listener of listeners) listener();
}

export function subscribeToLocalData(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocalDataVersion() {
  return dataVersion;
}

function mapReview(row: ReviewRow): LocalRestaurantReview {
  return {
    localId: row.local_id,
    serverId: row.server_id,
    clientRevision: row.client_revision,
    clientCreatedAt: row.client_created_at,
    restaurantName: row.restaurant_name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    review: row.review,
    createdAt: row.client_created_at,
    syncState: row.sync_state,
    lastSyncError: row.last_sync_error,
  };
}

function mapFood(row: FoodRow): LocalFood {
  return {
    localId: row.local_id,
    serverId: row.server_id,
    clientRevision: row.client_revision,
    clientCreatedAt: row.client_created_at,
    localUri: row.local_uri,
    localSize: row.local_size,
    remoteUrl: row.remote_url,
    imageProviderId: row.image_provider_id,
    restaurantLocalId: row.restaurant_local_id,
    createdAt: row.client_created_at,
    syncState: row.sync_state,
    lastSyncError: row.last_sync_error,
  };
}

async function enqueueJob(
  db: SQLiteDatabase,
  jobType: OutboxJobType,
  entityLocalId: string,
  now = Date.now(),
) {
  await db.runAsync(
    `INSERT INTO outbox (
       id, job_type, entity_local_id, attempts, next_attempt_at, created_at, updated_at
     ) VALUES (?, ?, ?, 0, ?, ?, ?)
     ON CONFLICT(job_type, entity_local_id) DO UPDATE SET
       attempts = 0,
       next_attempt_at = excluded.next_attempt_at,
       last_error = NULL,
       updated_at = excluded.updated_at`,
    Crypto.randomUUID(),
    jobType,
    entityLocalId,
    now,
    now,
    now,
  );
}

export async function initializeLocalRepository() {
  await getDatabase();
  if (!photoDirectory.exists) {
    photoDirectory.create({ idempotent: true, intermediates: true });
  }
  notifyDataChanged();
}

export async function listLocalReviews() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReviewRow>(
    `SELECT * FROM restaurant_reviews
     WHERE deleted_at IS NULL
     ORDER BY client_created_at DESC`,
  );
  return rows.map(mapReview);
}

export async function listLocalFood() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT * FROM food
     WHERE deleted_at IS NULL
     ORDER BY client_created_at DESC`,
  );
  return rows.map(mapFood);
}

export async function createLocalReview(input: {
  restaurantName: string;
  address?: string;
  lat?: number;
  lng?: number;
  review: RestaurantRating;
}) {
  const db = await getDatabase();
  const localId = Crypto.randomUUID();
  const now = Date.now();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO restaurant_reviews (
         local_id, client_revision, client_created_at, restaurant_name,
         address, lat, lng, review, sync_state
       ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'pending')`,
      localId,
      now,
      input.restaurantName.trim(),
      input.address?.trim() || null,
      input.lat ?? null,
      input.lng ?? null,
      input.review,
    );
    await enqueueJob(tx, "review_upsert", localId, now);
  });
  notifyDataChanged();
  return localId;
}

export async function deleteLocalReview(localId: string) {
  const db = await getDatabase();
  const now = Date.now();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const review = await tx.getFirstAsync<ReviewRow>(
      "SELECT * FROM restaurant_reviews WHERE local_id = ?",
      localId,
    );
    if (!review) return;

    const linkedFood = await tx.getAllAsync<{ local_id: string }>(
      "SELECT local_id FROM food WHERE restaurant_local_id = ? AND deleted_at IS NULL",
      localId,
    );
    for (const item of linkedFood) {
      await tx.runAsync(
        `UPDATE food SET restaurant_local_id = NULL, client_revision = client_revision + 1,
         sync_state = 'pending', last_sync_error = NULL WHERE local_id = ?`,
        item.local_id,
      );
      await enqueueJob(tx, "food_link", item.local_id, now);
    }

    if (review.server_id === null && review.sync_state !== "syncing") {
      await tx.runAsync("DELETE FROM outbox WHERE entity_local_id = ?", localId);
      await tx.runAsync("DELETE FROM restaurant_reviews WHERE local_id = ?", localId);
      return;
    }

    await tx.runAsync(
      `UPDATE restaurant_reviews SET deleted_at = ?, client_revision = client_revision + 1,
       sync_state = 'pending', last_sync_error = NULL WHERE local_id = ?`,
      now,
      localId,
    );
    await tx.runAsync(
      "DELETE FROM outbox WHERE job_type = 'review_upsert' AND entity_local_id = ?",
      localId,
    );
    await enqueueJob(tx, "review_delete", localId, now);
  });
  notifyDataChanged();
}

export async function createLocalFoodFromPhoto(photoUri: string) {
  const db = await getDatabase();
  const localId = Crypto.randomUUID();
  const now = Date.now();
  if (!photoDirectory.exists) {
    photoDirectory.create({ idempotent: true, intermediates: true });
  }
  const source = new File(photoUri);
  const destination = new File(photoDirectory, `${localId}.png`);
  await source.copy(destination);
  const size = destination.info().size ?? 0;

  try {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        `INSERT INTO food (
           local_id, client_revision, client_created_at, local_uri, local_size, sync_state
         ) VALUES (?, 1, ?, ?, ?, 'pending')`,
        localId,
        now,
        destination.uri,
        size,
      );
      await enqueueJob(tx, "food_upload", localId, now);
    });
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }

  notifyDataChanged();
  return localId;
}

export async function connectLocalFoodToReview(foodLocalId: string, reviewLocalId: string | null) {
  const db = await getDatabase();
  const now = Date.now();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `UPDATE food SET restaurant_local_id = ?, client_revision = client_revision + 1,
       sync_state = 'pending', last_sync_error = NULL WHERE local_id = ?`,
      reviewLocalId,
      foodLocalId,
    );
    await enqueueJob(tx, "food_link", foodLocalId, now);
  });
  notifyDataChanged();
}

export async function getDueOutboxJobs(limit: number) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT id, job_type, entity_local_id, attempts, next_attempt_at
     FROM outbox WHERE next_attempt_at <= ? ORDER BY created_at LIMIT ?`,
    Date.now(),
    limit,
  );
  return rows.map<OutboxJob>((row) => ({
    id: row.id,
    jobType: row.job_type,
    entityLocalId: row.entity_local_id,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
  }));
}

export async function getReviewForSync(localId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ReviewRow & { deleted_at: number | null }>(
    "SELECT * FROM restaurant_reviews WHERE local_id = ?",
    localId,
  );
  return row ? { ...mapReview(row), deletedAt: row.deleted_at } : null;
}

export async function getFoodForSync(localId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<FoodRow>("SELECT * FROM food WHERE local_id = ?", localId);
  if (!row) return null;
  const restaurant = row.restaurant_local_id
    ? await db.getFirstAsync<{ local_id: string; server_id: string | null }>(
        "SELECT local_id, server_id FROM restaurant_reviews WHERE local_id = ?",
        row.restaurant_local_id,
      )
    : null;
  return {
    ...mapFood(row),
    restaurantServerId: restaurant?.server_id ?? null,
  };
}

export async function markJobSyncing(job: OutboxJob) {
  const db = await getDatabase();
  const table = job.jobType.startsWith("review_") ? "restaurant_reviews" : "food";
  await db.runAsync(
    `UPDATE ${table} SET sync_state = 'syncing', last_sync_error = NULL WHERE local_id = ?`,
    job.entityLocalId,
  );
  notifyDataChanged();
}

export async function completeReviewJob(job: OutboxJob, serverId?: string) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync("DELETE FROM outbox WHERE id = ?", job.id);
    if (job.jobType === "review_delete") {
      await tx.runAsync("DELETE FROM restaurant_reviews WHERE local_id = ?", job.entityLocalId);
    } else {
      const remaining = await tx.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM outbox WHERE entity_local_id = ?",
        job.entityLocalId,
      );
      await tx.runAsync(
        `UPDATE restaurant_reviews SET server_id = COALESCE(?, server_id), sync_state = ?,
         last_sync_error = NULL WHERE local_id = ?`,
        serverId ?? null,
        (remaining?.count ?? 0) > 0 ? "pending" : "synced",
        job.entityLocalId,
      );
    }
  });
  notifyDataChanged();
}

export async function completeFoodJob(job: OutboxJob, serverId?: string) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync("DELETE FROM outbox WHERE id = ?", job.id);
    const remaining = await tx.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM outbox WHERE entity_local_id = ?",
      job.entityLocalId,
    );
    await tx.runAsync(
      `UPDATE food SET server_id = COALESCE(?, server_id), sync_state = ?, last_sync_error = NULL
       WHERE local_id = ?`,
      serverId ?? null,
      (remaining?.count ?? 0) > 0 ? "pending" : "synced",
      job.entityLocalId,
    );
  });
  notifyDataChanged();
}

export async function failOutboxJob(job: OutboxJob, error: string) {
  const db = await getDatabase();
  const { attempts, nextAttemptAt, state } = getRetryOutcome(job.attempts, Date.now());
  const table = job.jobType.startsWith("review_") ? "restaurant_reviews" : "food";
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `UPDATE outbox SET attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ?`,
      attempts,
      nextAttemptAt,
      error.slice(0, 500),
      Date.now(),
      job.id,
    );
    await tx.runAsync(
      `UPDATE ${table} SET sync_state = ?, last_sync_error = ? WHERE local_id = ?`,
      state,
      error.slice(0, 500),
      job.entityLocalId,
    );
  });
  notifyDataChanged();
}

async function hasOutboxJobs(db: SQLiteDatabase, localId: string) {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM outbox WHERE entity_local_id = ?",
    localId,
  );
  return (row?.count ?? 0) > 0;
}

export async function reconcileRemoteReviews(items: RemoteRestaurantReview[]) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const item of items) {
      const existing = await tx.getFirstAsync<ReviewRow & { deleted_at: number | null }>(
        "SELECT * FROM restaurant_reviews WHERE local_id = ? OR server_id = ? LIMIT 1",
        item.clientId,
        item._id,
      );
      if (existing && (await hasOutboxJobs(tx, existing.local_id))) continue;
      if (item.deletedAt !== undefined) {
        if (existing)
          await tx.runAsync("DELETE FROM restaurant_reviews WHERE local_id = ?", existing.local_id);
        continue;
      }

      if (existing) {
        await tx.runAsync(
          `UPDATE restaurant_reviews SET server_id = ?, client_revision = ?, client_created_at = ?,
           server_updated_at = ?, restaurant_name = ?, address = ?, lat = ?, lng = ?, review = ?,
           deleted_at = NULL, sync_state = 'synced', last_sync_error = NULL WHERE local_id = ?`,
          item._id,
          item.clientRevision,
          item.clientCreatedAt,
          item.serverUpdatedAt,
          item.restaurantName,
          item.address ?? null,
          item.lat ?? null,
          item.lng ?? null,
          item.review,
          existing.local_id,
        );
      } else {
        await tx.runAsync(
          `INSERT INTO restaurant_reviews (
             local_id, server_id, client_revision, client_created_at, server_updated_at,
             restaurant_name, address, lat, lng, review, sync_state
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          item.clientId,
          item._id,
          item.clientRevision,
          item.clientCreatedAt,
          item.serverUpdatedAt,
          item.restaurantName,
          item.address ?? null,
          item.lat ?? null,
          item.lng ?? null,
          item.review,
        );
      }
    }
  });
  notifyDataChanged();
}

export async function reconcileRemoteFood(items: RemoteFood[]) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const item of items) {
      const existing = await tx.getFirstAsync<FoodRow & { deleted_at: number | null }>(
        "SELECT * FROM food WHERE local_id = ? OR server_id = ? LIMIT 1",
        item.clientId,
        item._id,
      );
      if (existing && (await hasOutboxJobs(tx, existing.local_id))) continue;
      if (item.deletedAt !== undefined) {
        if (existing) await tx.runAsync("DELETE FROM food WHERE local_id = ?", existing.local_id);
        continue;
      }

      const restaurant = item.restaurant
        ? await tx.getFirstAsync<{ local_id: string }>(
            "SELECT local_id FROM restaurant_reviews WHERE server_id = ?",
            item.restaurant,
          )
        : null;
      // Once Convex has accepted the photo, any pending image processing is
      // server-side work and no longer depends on this device staying online.
      const syncState: SyncState = item.uploadStatus === "failed" ? "failed" : "synced";

      if (existing) {
        await tx.runAsync(
          `UPDATE food SET server_id = ?, client_revision = MAX(client_revision, ?),
           client_created_at = ?, server_updated_at = ?, remote_url = ?, image_provider_id = ?,
           restaurant_local_id = ?, sync_state = ?, last_sync_error = ? WHERE local_id = ?`,
          item._id,
          item.clientRevision,
          item.clientCreatedAt,
          item.serverUpdatedAt,
          item.imageUrl || null,
          item.imageProviderID || null,
          restaurant?.local_id ?? null,
          syncState,
          item.uploadError ?? null,
          existing.local_id,
        );
        if (item.uploadStatus === "failed" && existing.local_uri) {
          await enqueueJob(tx, "food_upload", existing.local_id);
        }
      } else {
        await tx.runAsync(
          `INSERT INTO food (
             local_id, server_id, client_revision, client_created_at, server_updated_at,
             remote_url, image_provider_id, restaurant_local_id, sync_state, last_sync_error
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          item.clientId,
          item._id,
          item.clientRevision,
          item.clientCreatedAt,
          item.serverUpdatedAt,
          item.imageUrl || null,
          item.imageProviderID || null,
          restaurant?.local_id ?? null,
          syncState,
          item.uploadError ?? null,
        );
      }
    }
  });
  await enforceLocalPhotoLimit();
  notifyDataChanged();
}

export async function enforceLocalPhotoLimit() {
  const db = await getDatabase();
  const synced = await db.getAllAsync<{ local_id: string; local_uri: string; local_size: number }>(
    `SELECT local_id, local_uri, local_size FROM food
     WHERE sync_state = 'synced' AND local_uri IS NOT NULL AND local_size IS NOT NULL
     ORDER BY client_created_at ASC`,
  );
  let total = synced.reduce((sum, item) => sum + item.local_size, 0);
  for (const item of synced) {
    if (total <= LOCAL_PHOTO_LIMIT_BYTES) break;
    const file = new File(item.local_uri);
    if (file.exists) file.delete();
    await db.runAsync(
      "UPDATE food SET local_uri = NULL, local_size = NULL WHERE local_id = ?",
      item.local_id,
    );
    total -= item.local_size;
  }
}
