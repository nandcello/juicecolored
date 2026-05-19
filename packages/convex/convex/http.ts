import { httpRouter } from "convex/server";
import { UTApi } from "uploadthing/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

const utapi = new UTApi();

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

http.route({
  path: "/food/photo",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const photoBlob = await request.blob();

    if (photoBlob.size === 0) {
      return Response.json({ error: "A photo file is required." }, { status: 400 });
    }

    const photo = new File([photoBlob], "food-photo.png", {
      type: photoBlob.type || request.headers.get("content-type") || "image/png",
    });

    const upload = await utapi.uploadFiles(photo, {
      contentDisposition: "inline",
    });

    if (upload.error !== null) {
      return Response.json({ error: upload.error.message }, { status: 502 });
    }

    try {
      const foodId = await ctx.runMutation(internal.food.createFromUpload, {
        imageUrl: upload.data.url,
        imageProviderID: upload.data.key,
      });

      return Response.json({ foodId });
    } catch (error) {
      await deleteUploadedFile(upload.data.key);
      throw error;
    }
  }),
});

export default http;
