import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import stylex from "@stylexjs/eslint-plugin";
import ts from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...ts,
  {
    plugins: { "@stylexjs": stylex },
    rules: {
      "@stylexjs/valid-styles": "error",
      "@stylexjs/valid-shorthands": "error",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([".next/**", "convex/_generated/**", "convex/adapters/vendor/**"]),
]);
