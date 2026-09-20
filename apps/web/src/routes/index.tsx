import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { api } from "@personal/convex";
import { PortfolioBook } from "#/components/portfolio/book";

const getInitialListeningStatus = createServerFn({ method: "GET" }).handler(async () => {
  const convexUrl = process.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    return null;
  }

  const { ConvexHttpClient } = await import("convex/browser");

  return new ConvexHttpClient(convexUrl).query(api.listening.get, {});
});

const getInitialRecentFood = createServerFn({ method: "GET" }).handler(async () => {
  const convexUrl = process.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    return null;
  }

  const { ConvexHttpClient } = await import("convex/browser");

  return new ConvexHttpClient(convexUrl).query(api.food.recent, {});
});

export const Route = createFileRoute("/")({
  loader: async () => {
    const [initialListeningStatus, initialRecentFood] = await Promise.all([
      getInitialListeningStatus(),
      getInitialRecentFood(),
    ]);
    return { initialListeningStatus, initialRecentFood };
  },
  component: Home,
});

function Home() {
  const { initialListeningStatus, initialRecentFood } = Route.useLoaderData();
  return (
    <PortfolioBook
      initialListeningStatus={initialListeningStatus}
      initialRecentFood={initialRecentFood}
    />
  );
}
