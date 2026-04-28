import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import appCss from "../styles.css?url";

const siteUrl = "https://juicecolored.com";
const siteTitle = "Niño Mollaneda | JuiceColored";
const siteDescription = "Thoughtful web apps, product systems, and useful tools by Niño Mollaneda.";
const ogImageUrl = "https://u87gtvu295.ufs.sh/f/mqA1Bp30wBSQORFFqRGdzqpZveMfBuro8yLwXgIcQ9YsF2PU";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: siteTitle,
      },
      {
        name: "description",
        content: siteDescription,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: siteUrl,
      },
      {
        property: "og:title",
        content: siteTitle,
      },
      {
        property: "og:description",
        content: siteDescription,
      },
      {
        property: "og:image",
        content: ogImageUrl,
      },
      {
        property: "og:image:width",
        content: "1200",
      },
      {
        property: "og:image:height",
        content: "630",
      },
      {
        property: "og:image:alt",
        content: "Niño Mollaneda portfolio preview for JuiceColored",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: siteTitle,
      },
      {
        name: "twitter:description",
        content: siteDescription,
      },
      {
        name: "twitter:image",
        content: ogImageUrl,
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
        sizes: "any",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-full">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#fafaf7] font-sans text-[#101010] antialiased [text-rendering:optimizeLegibility]">
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
