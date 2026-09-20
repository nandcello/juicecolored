import { api } from "@personal/convex";
import type { Id } from "@personal/convex/dataModel";
import { ConvexHttpClient } from "convex/browser";
import * as Network from "expo-network";

import {
  completeFoodJob,
  completeReviewJob,
  failOutboxJob,
  getDueOutboxJobs,
  getFoodForSync,
  getReviewForSync,
  markJobSyncing,
  reconcileRemoteFood,
  reconcileRemoteReviews,
} from "./repository";
import type { OutboxJob, RemoteFood, RemoteRestaurantReview } from "./types";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

let activeSync: Promise<boolean> | null = null;

type SyncPage<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string;
};

async function processReviewJob(job: OutboxJob) {
  if (!convexClient) throw new Error("Convex is not configured.");
  const review = await getReviewForSync(job.entityLocalId);
  if (!review) {
    await completeReviewJob(job);
    return;
  }

  if (job.jobType === "review_delete") {
    await convexClient.mutation(api.restaurantReviews.syncRemove, {
      clientId: review.localId,
      clientRevision: review.clientRevision,
      ...(review.serverId ? { legacyId: review.serverId as Id<"restaurantReviews"> } : {}),
    });
    await completeReviewJob(job);
    return;
  }

  const result = await convexClient.mutation(api.restaurantReviews.syncUpsert, {
    clientId: review.localId,
    clientRevision: review.clientRevision,
    clientCreatedAt: review.clientCreatedAt,
    restaurantName: review.restaurantName,
    ...(review.address ? { address: review.address } : {}),
    ...(review.lat !== null && review.lng !== null ? { lat: review.lat, lng: review.lng } : {}),
    review: review.review,
  });
  await completeReviewJob(job, result.id);
}

async function uploadFood(job: OutboxJob) {
  if (!convexSiteUrl) throw new Error("Convex uploads are not configured.");
  const food = await getFoodForSync(job.entityLocalId);
  if (!food) {
    await completeFoodJob(job);
    return;
  }
  if (!food.localUri) throw new Error("The local photo file is no longer available.");

  const localResponse = await fetch(food.localUri);
  const photo = await localResponse.blob();
  const response = await fetch(`${convexSiteUrl}/food/photo`, {
    method: "POST",
    headers: {
      "content-type": photo.type || "image/png",
      "x-client-id": food.localId,
      "x-client-revision": String(food.clientRevision),
      "x-client-created-at": String(food.clientCreatedAt),
    },
    body: photo,
  });
  const result = (await response.json().catch(() => null)) as {
    foodId?: string;
    status?: "pending" | "processing" | "complete" | "failed";
    error?: string;
  } | null;
  if (!response.ok && response.status !== 202) {
    throw new Error(result?.error ?? "Could not upload the food photo.");
  }
  if (!result?.foodId) throw new Error("The photo upload did not return a food ID.");
  await completeFoodJob(job, result.foodId);
}

async function connectFood(job: OutboxJob) {
  if (!convexClient) throw new Error("Convex is not configured.");
  const food = await getFoodForSync(job.entityLocalId);
  if (!food) {
    await completeFoodJob(job);
    return;
  }
  const result = await convexClient.mutation(api.food.syncConnectRestaurant, {
    clientId: food.localId,
    clientRevision: food.clientRevision,
    ...(food.serverId ? { legacyId: food.serverId as Id<"food"> } : {}),
    ...(food.restaurantLocalId ? { restaurantClientId: food.restaurantLocalId } : {}),
    ...(food.restaurantServerId
      ? { restaurantLegacyId: food.restaurantServerId as Id<"restaurantReviews"> }
      : {}),
  });
  await completeFoodJob(job, result.id);
}

async function processJob(job: OutboxJob) {
  await markJobSyncing(job);
  try {
    if (job.jobType === "review_upsert" || job.jobType === "review_delete") {
      await processReviewJob(job);
    } else if (job.jobType === "food_upload") {
      await uploadFood(job);
    } else {
      await connectFood(job);
    }
  } catch (error) {
    await failOutboxJob(
      job,
      error instanceof Error ? error.message : "The sync operation could not be completed.",
    );
  }
}

async function pullReviews() {
  if (!convexClient) return;
  let cursor: string | null = null;
  do {
    const result: SyncPage<RemoteRestaurantReview> = await convexClient.query(
      api.restaurantReviews.syncPage,
      {
        paginationOpts: { numItems: 100, cursor },
      },
    );
    await reconcileRemoteReviews(result.page);
    cursor = result.isDone ? null : result.continueCursor;
    if (result.isDone) break;
  } while (cursor);
}

async function pullFood() {
  if (!convexClient) return;
  let cursor: string | null = null;
  do {
    const result: SyncPage<RemoteFood> = await convexClient.query(api.food.syncPage, {
      paginationOpts: { numItems: 100, cursor },
    });
    await reconcileRemoteFood(result.page);
    cursor = result.isDone ? null : result.continueCursor;
    if (result.isDone) break;
  } while (cursor);
}

async function performSync(maxJobs: number) {
  if (!convexClient) return false;
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.isInternetReachable === false) return false;

  const jobs = await getDueOutboxJobs(maxJobs);
  for (const job of jobs) await processJob(job);

  try {
    await pullReviews();
    await pullFood();
  } catch {
    return jobs.length > 0;
  }
  return true;
}

export function runOfflineSync(maxJobs = 20) {
  activeSync ??= performSync(maxJobs).finally(() => {
    activeSync = null;
  });
  return activeSync;
}
