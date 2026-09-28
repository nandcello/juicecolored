import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import PortfolioNotFound from "#/components/portfolio/not-found-document";
import { metadata as portfolioMetadata } from "#/lib/site-metadata";
import JarvisNotFound from "@personal/jarvis/app/not-found-document";
import {
  metadata as jarvisMetadata,
  viewport as jarvisViewport,
} from "@personal/jarvis/app/metadata";
import CanceldtNotFound from "@personal/canceldt/app/not-found-document";
import { metadata as canceldtMetadata } from "@personal/canceldt/app/metadata";

// Resolve the request's area before sending the complete 404 document. Streaming
// an empty error shell would leave visitors without JavaScript on a blank page.
export const instant = false;

async function area() {
  return (await headers()).get("x-personal-area");
}

export async function generateMetadata(): Promise<Metadata> {
  switch (await area()) {
    case "jarvis":
      return { ...jarvisMetadata, icons: { icon: "/jarvis/icon.svg" } };
    case "canceldt":
      return { ...canceldtMetadata, title: { absolute: "CANCELDT. — Check the list." } };
    default:
      return { ...portfolioMetadata, title: "404: This page could not be found." };
  }
}

export async function generateViewport(): Promise<Viewport> {
  return (await area()) === "jarvis" ? jarvisViewport : { width: "device-width", initialScale: 1 };
}

export default async function GlobalNotFound() {
  switch (await area()) {
    case "jarvis":
      return <JarvisNotFound />;
    case "canceldt":
      return <CanceldtNotFound />;
    default:
      return <PortfolioNotFound />;
  }
}
