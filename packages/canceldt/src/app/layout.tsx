import type { ReactNode } from "react";
import { Document } from "../components/document";
import "@fontsource/barlow-condensed/latin-800.css";
import "./globals.css";

export { metadata } from "./metadata";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return <Document>{children}</Document>;
}
