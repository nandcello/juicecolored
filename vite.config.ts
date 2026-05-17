import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["apps/mobile/src/uniwind-types.d.ts", "packages/convex/convex/_generated/**"],
  },
  staged: {
    "!(apps/mobile/src/uniwind-types.d.ts|packages/convex/convex/_generated/**)": "vp check --fix",
  },
});
