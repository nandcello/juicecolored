import { api } from "@personal/convex";
import { ConvexHttpClient } from "convex/browser";
import { connection } from "next/server";
import { Suspense } from "react";

import { PortfolioBook } from "#/components/portfolio/book";
import { SmallPleasures } from "#/components/portfolio/small-pleasures";

export default function Home() {
  return (
    <PortfolioBook
      pleasures={
        <Suspense
          fallback={<SmallPleasures initialListeningStatus={null} initialRecentFood={null} />}
        >
          <InitialSmallPleasures />
        </Suspense>
      }
    />
  );
}

// Server-render a fresh snapshot per request; the client subscription keeps it live.
async function InitialSmallPleasures() {
  await connection();
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return <SmallPleasures initialListeningStatus={null} initialRecentFood={null} />;
  }
  const client = new ConvexHttpClient(convexUrl);
  const [initialListeningStatus, initialRecentFood] = await Promise.all([
    client.query(api.listening.get, {}),
    client.query(api.food.recent, {}),
  ]);
  return (
    <SmallPleasures
      initialListeningStatus={initialListeningStatus}
      initialRecentFood={initialRecentFood}
    />
  );
}
