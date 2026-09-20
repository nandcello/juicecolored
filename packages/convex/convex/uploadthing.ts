"use node";

import { makeFunctionReference, type FunctionReference } from "convex/server";
import { v } from "convex/values";
import { UTApi } from "uploadthing/server";

import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

const utapi = new UTApi();
const MAX_UPLOAD_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000];

const claimPendingUpload = makeFunctionReference<
  "mutation",
  { foodId: Id<"food">; attempt: number },
  { storageId: Id<"_storage">; contentType: string } | null
>("food:claimPendingUpload") as unknown as FunctionReference<
  "mutation",
  "internal",
  { foodId: Id<"food">; attempt: number },
  { storageId: Id<"_storage">; contentType: string } | null
>;

const completeUpload = makeFunctionReference<
  "mutation",
  { foodId: Id<"food">; imageUrl: string; imageProviderID: string },
  Id<"food">
>("food:completeUpload") as unknown as FunctionReference<
  "mutation",
  "internal",
  { foodId: Id<"food">; imageUrl: string; imageProviderID: string },
  Id<"food">
>;

const recordUploadFailure = makeFunctionReference<
  "mutation",
  { foodId: Id<"food">; attempt: number; error: string; final: boolean },
  null
>("food:recordUploadFailure") as unknown as FunctionReference<
  "mutation",
  "internal",
  { foodId: Id<"food">; attempt: number; error: string; final: boolean },
  null
>;

const processQueuedFoodUploadRef = makeFunctionReference<
  "action",
  { foodId: Id<"food">; attempt: number },
  null
>("uploadthing:processQueuedFoodUpload") as unknown as FunctionReference<
  "action",
  "internal",
  { foodId: Id<"food">; attempt: number },
  null
>;

async function deleteUploadedFile(fileKey: string) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await utapi.deleteFiles(fileKey);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export const processQueuedFoodUpload = internalAction({
  args: {
    foodId: v.id("food"),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const uploadInfo = await ctx.runMutation(claimPendingUpload, args);
    if (uploadInfo === null) {
      return null;
    }

    let uploadedFileKey: string | null = null;
    try {
      const photoBlob = await ctx.storage.get(uploadInfo.storageId);
      if (photoBlob === null) {
        throw new Error("Queued photo was not found in Convex storage.");
      }

      const photo = new File([photoBlob], `${args.foodId}.png`, {
        type: uploadInfo.contentType || photoBlob.type || "image/png",
      });
      const upload = await utapi.uploadFiles(photo, { contentDisposition: "inline" });
      if (upload.error !== null) {
        throw new Error(upload.error.message);
      }

      uploadedFileKey = upload.data.key;
      await ctx.runMutation(completeUpload, {
        foodId: args.foodId,
        imageUrl: upload.data.ufsUrl,
        imageProviderID: upload.data.key,
      });
      await ctx.storage.delete(uploadInfo.storageId);
      return null;
    } catch (error) {
      if (uploadedFileKey) {
        await deleteUploadedFile(uploadedFileKey).catch(() => undefined);
      }

      const nextAttempt = args.attempt + 1;
      const final = nextAttempt >= MAX_UPLOAD_ATTEMPTS;
      const errorMessage = error instanceof Error ? error.message : "Photo processing failed.";
      await ctx.runMutation(recordUploadFailure, {
        foodId: args.foodId,
        attempt: nextAttempt,
        error: errorMessage,
        final,
      });

      if (!final) {
        await ctx.scheduler.runAfter(
          RETRY_DELAYS_MS[args.attempt] ?? 3_600_000,
          processQueuedFoodUploadRef,
          {
            foodId: args.foodId,
            attempt: nextAttempt,
          },
        );
      }
      return null;
    }
  },
});
