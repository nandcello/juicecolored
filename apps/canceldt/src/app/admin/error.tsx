"use client";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
export default function AdminError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <section role="alert">
      <h1>The edit desk could not be loaded.</h1>
      <p>
        The administrator service is temporarily unavailable. Your session has not been cleared.
        Please retry.
      </p>
      <button onClick={retry}>Retry →</button>
    </section>
  );
}
