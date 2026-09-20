import { createFileRoute } from "@tanstack/react-router";
import { handleSpamRequest } from "../server/spam/handler.server";

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      ANY: ({ request }) => handleSpamRequest(request),
    },
  },
});
