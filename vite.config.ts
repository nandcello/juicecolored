import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: { dedupe: ["react", "react-dom"] },
  fmt: {
    ignorePatterns: [
      "**/.agents/**",
      "**/.codex/**",
      "apps/web/src/routeTree.gen.ts",
      "apps/mobile/src/uniwind-types.d.ts",
      "**/convex/_generated/**",
      "apps/jarvis/convex/adapters/vendor/**",
      "**/.next/**",
      "**/next-env.d.ts",
    ],
  },
  lint: {
    ignorePatterns: [
      "**/.agents/**",
      "**/.codex/**",
      "**/_generated/**",
      "**/routeTree.gen.ts",
      "**/uniwind-types.d.ts",
      "**/.next/**",
      "**/next-env.d.ts",
      "apps/jarvis/convex/adapters/vendor/**",
    ],
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
  staged: {
    "!(apps/mobile/src/uniwind-types.d.ts|packages/convex/convex/_generated/**)": "vp check --fix",
  },
});
