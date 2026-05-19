"use node";

import { v } from "convex/values";
import { makeFunctionReference, type FunctionReference } from "convex/server";
import { UTApi } from "uploadthing/server";

import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

const utapi = new UTApi();

const createPendingUpload = makeFunctionReference<"mutation", Record<string, never>, Id<"food">>(
  "food:createPendingUpload",
) as unknown as FunctionReference<"mutation", "internal", Record<string, never>, Id<"food">>;

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

const deletePendingUpload = makeFunctionReference<"mutation", { foodId: Id<"food"> }, null>(
  "food:deletePendingUpload",
) as unknown as FunctionReference<"mutation", "internal", { foodId: Id<"food"> }, null>;

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

export const createFoodFromStoredPhoto = internalAction({
  args: {
    storageId: v.id("_storage"),
    contentType: v.string(),
  },
  returns: v.id("food"),
  handler: async (ctx, args): Promise<Id<"food">> => {
    const photoBlob = await ctx.storage.get(args.storageId);

    if (photoBlob === null) {
      throw new Error("Uploaded photo was not found in Convex storage.");
    }

    const foodId: Id<"food"> = await ctx.runMutation(createPendingUpload, {});

    await ctx.storage.delete(args.storageId);

    const photo = new File([photoBlob], `${foodId}.png`, {
      type: args.contentType || photoBlob.type || "image/png",
    });

    const upload = await utapi.uploadFiles(photo, {
      contentDisposition: "inline",
    });

    if (upload.error !== null) {
      await ctx.runMutation(deletePendingUpload, { foodId });
      throw new Error(upload.error.message);
    }

    try {
      return await ctx.runMutation(completeUpload, {
        foodId,
        imageUrl: upload.data.ufsUrl,
        imageProviderID: upload.data.key,
      });
    } catch (error) {
      await deleteUploadedFile(upload.data.key);
      await ctx.runMutation(deletePendingUpload, { foodId });
      throw error;
    }
  },
});
