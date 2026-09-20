import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [
      "**/.agents/**",
      "**/.codex/**",
      "apps/web/src/routeTree.gen.ts",
      "apps/mobile/src/uniwind-types.d.ts",
      "packages/convex/convex/_generated/**",
    ],
  },
  lint: {
    ignorePatterns: [
      "**/.agents/**",
      "**/.codex/**",
      "**/_generated/**",
      "**/routeTree.gen.ts",
      "**/uniwind-types.d.ts",
    ],
    options: { typeAware: true, typeCheck: true },
  },
  staged: {
    "!(apps/mobile/src/uniwind-types.d.ts|packages/convex/convex/_generated/**)": "vp check --fix",
  },
});
