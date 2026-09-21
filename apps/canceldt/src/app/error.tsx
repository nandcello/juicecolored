"use client";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <section role="alert">
      <h1>The check could not be completed.</h1>
      <p>Please try again.</p>
      <button onClick={retry}>Retry →</button>
    </section>
  );
}
