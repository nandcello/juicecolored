import { Suspense } from "react";
import { cookies } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import { api } from "../../convex/_generated/api";
import { backend, configured } from "@/lib/backend";
import { COOKIE_NAME, validSession } from "@/lib/session";
import { BUILTIN_SCENES, INTEGRATIONS } from "@/lib/domain";
import type { Snapshot } from "@/lib/domain";
import { Dashboard } from "@/components/dashboard";
import { Welcome } from "@/components/welcome";

// The integration catalog is cacheable. Owner sessions and observed device state are always fresh.
async function catalog() {
  "use cache";
  cacheLife("days");
  cacheTag("integration-catalog");
  return { scenes: BUILTIN_SCENES, integrations: INTEGRATIONS };
}
async function Home() {
  const available = await catalog();
  if (!configured()) return <Welcome configured={false} />;
  if (!(await validSession((await cookies()).get(COOKIE_NAME)?.value)))
    return <Welcome configured />;
  let state: Snapshot | undefined;
  try {
    const { client, secret } = backend();
    state = (await client.query(api.store.snapshot, { secret })) as Snapshot;
  } catch {
    /* The request failed; show a recoverable screen below. */
  }
  if (!state) {
    return (
      <Welcome configured error="The backend is temporarily unavailable. Reload to try again." />
    );
  }
  return <Dashboard initial={state} presets={available.scenes} />;
}
export default function Page() {
  return (
    <Suspense fallback={<Welcome loading configured />}>
      <Home />
    </Suspense>
  );
}
