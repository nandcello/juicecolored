import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/food/photo",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const photoBlob = await request.blob();

    if (photoBlob.size === 0) {
      return Response.json({ error: "A photo file is required." }, { status: 400 });
    }

    const storageId = await ctx.storage.store(photoBlob);
    const foodId = await ctx.runAction(internal.uploadthing.createFoodFromStoredPhoto, {
      storageId,
      contentType: photoBlob.type || request.headers.get("content-type") || "image/png",
    });

    return Response.json({ foodId });
  }),
});

export default http;
