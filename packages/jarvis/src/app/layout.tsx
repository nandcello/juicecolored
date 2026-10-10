import "../globals.css";
import { PullToRefresh } from "../components/pull-to-refresh";

export { metadata, viewport } from "./metadata";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PullToRefresh>{children}</PullToRefresh>
      </body>
    </html>
  );
}
