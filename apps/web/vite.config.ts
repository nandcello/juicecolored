import { defineConfig, loadEnv } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, "../..", "JARVIS_");
  const jarvisOrigin = (
    process.env.JARVIS_ORIGIN ||
    env.JARVIS_ORIGIN ||
    (command === "serve" ? "http://127.0.0.1:3001" : "https://jarvis-pi-brown.vercel.app")
  ).replace(/\/$/, "");

  return {
    envDir: "../..",
    server: {
      proxy: {
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
      devtools(),
      nitro({
        routeRules: {
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
