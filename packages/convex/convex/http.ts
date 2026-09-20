import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/food/photo",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const clientId = request.headers.get("x-client-id")?.trim();
    const clientRevision = Number(request.headers.get("x-client-revision") ?? "1");
    const clientCreatedAt = Number(request.headers.get("x-client-created-at") ?? Date.now());

    if (!clientId || clientId.length > 128) {
      return Response.json({ error: "A valid client ID is required." }, { status: 400 });
    }
    if (!Number.isSafeInteger(clientRevision) || clientRevision < 0) {
      return Response.json({ error: "A valid client revision is required." }, { status: 400 });
    }
    if (!Number.isFinite(clientCreatedAt) || clientCreatedAt <= 0) {
      return Response.json({ error: "A valid client creation time is required." }, { status: 400 });
    }

    const photoBlob = await request.blob();

    if (photoBlob.size === 0) {
      return Response.json({ error: "A photo file is required." }, { status: 400 });
    }

    const storageId = await ctx.storage.store(photoBlob);
    let result: {
      foodId: string;
      status: "pending" | "processing" | "complete" | "failed";
    };
    try {
      result = await ctx.runMutation(internal.food.createPendingUpload, {
        clientId,
        clientRevision,
        clientCreatedAt,
        storageId,
        contentType: photoBlob.type || request.headers.get("content-type") || "image/png",
      });
    } catch (error) {
      await ctx.storage.delete(storageId).catch(() => undefined);
      throw error;
    }

    return Response.json(result, { status: result.status === "complete" ? 200 : 202 });
  }),
});

export default http;
