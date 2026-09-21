import { defineConfig, loadEnv } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, "../..", ["JARVIS_", "CANCELDT_"]);
  const jarvisOrigin = (
    process.env.JARVIS_ORIGIN ||
    env.JARVIS_ORIGIN ||
    (command === "serve" ? "http://127.0.0.1:3001" : "https://jarvis-pi-brown.vercel.app")
  ).replace(/\/$/, "");

  const canceldtOrigin = (
    process.env.CANCELDT_ORIGIN ||
    env.CANCELDT_ORIGIN ||
    "http://127.0.0.1:3002"
  ).replace(/\/$/, "");
  return {
    envDir: "../..",
    server: {
      proxy: {
        "^/canceldt(?:/|$)": { target: canceldtOrigin, ws: true },
        "^/jarvis(?:/|$)": {
          target: jarvisOrigin,
          ws: true,
        },
      },
    },
    staged: {
      "*": "vp check --fix",
    },
    resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
    plugins: [
      {
        name: "canceldt-admin-alias",
        buildStart() {
          if (command === "build" && !process.env.CANCELDT_ORIGIN && !env.CANCELDT_ORIGIN)
            this.error(
              "Set CANCELDT_ORIGIN to the deployed CANCELDT Next.js origin before building the main site.",
            );
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.split("?")[0] === "/calceldt/admin") {
              res.writeHead(308, { Location: "/canceldt/admin" });
              res.end();
              return;
            }
            next();
          });
        },
      },
      devtools(),
      nitro({
        routeRules: {
          "/canceldt": { proxy: `${canceldtOrigin}/canceldt` },
          "/canceldt/**": { proxy: `${canceldtOrigin}/canceldt/**` },
          "/calceldt/admin": { redirect: { to: "/canceldt/admin", status: 308 } },
          "/jarvis": { proxy: `${jarvisOrigin}/jarvis` },
          "/jarvis/**": { proxy: `${jarvisOrigin}/jarvis/**` },
        },
        rollupConfig: { external: [/^@sentry\//] },
        // A full batch can take five 10-second evaluation deadlines.
        vercel: { functions: { maxDuration: 60 } },
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  };
});

export default config;
