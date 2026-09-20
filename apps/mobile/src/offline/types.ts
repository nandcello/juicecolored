export const RATING_OPTIONS = [
  "actively avoid",
  "can visit again",
  "will visit again",
  "recommend",
] as const;

export type RestaurantRating = (typeof RATING_OPTIONS)[number];
export type SyncState = "pending" | "syncing" | "synced" | "failed";
export type OutboxJobType = "review_upsert" | "review_delete" | "food_upload" | "food_link";

export type LocalRestaurantReview = {
  localId: string;
  serverId: string | null;
  clientRevision: number;
  clientCreatedAt: number;
  restaurantName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  review: RestaurantRating;
  createdAt: number;
  syncState: SyncState;
  lastSyncError: string | null;
};

export type LocalFood = {
  localId: string;
  serverId: string | null;
  clientRevision: number;
  clientCreatedAt: number;
  localUri: string | null;
  localSize: number | null;
  remoteUrl: string | null;
  imageProviderId: string | null;
  restaurantLocalId: string | null;
  createdAt: number;
  syncState: SyncState;
  lastSyncError: string | null;
};

export type OutboxJob = {
  id: string;
  jobType: OutboxJobType;
  entityLocalId: string;
  attempts: number;
  nextAttemptAt: number;
};

export type RemoteRestaurantReview = {
  _id: string;
  _creationTime: number;
  clientId: string;
  clientRevision: number;
  clientCreatedAt: number;
  serverUpdatedAt: number;
  deletedAt?: number;
  restaurantName: string;
  address?: string;
  lat?: number;
  lng?: number;
  review: RestaurantRating;
};

export type RemoteFood = {
  _id: string;
  _creationTime: number;
  clientId: string;
  clientRevision: number;
  clientCreatedAt: number;
  serverUpdatedAt: number;
  deletedAt?: number;
  imageUrl: string;
  restaurant?: string;
  imageProviderID: string;
  uploadStatus: "pending" | "processing" | "complete" | "failed";
  uploadError?: string;
};
