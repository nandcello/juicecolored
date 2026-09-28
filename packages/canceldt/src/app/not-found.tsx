import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty">
      <h1>Nothing published here.</h1>
      <p>This entry is unavailable.</p>
      <Link href="/canceldt">Back to the list →</Link>
    </section>
  );
}
