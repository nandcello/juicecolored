import { stylexBabelConfig } from "../../packages/jarvis/stylex.config.mjs";

export default {
  plugins: {
    "@tailwindcss/postcss": {},
    "@stylexjs/postcss-plugin": {
      include: ["../../packages/jarvis/src/**/*.{ts,tsx}"],
      useCSSLayers: true,
      babelConfig: { babelrc: false, configFile: false, ...stylexBabelConfig },
    },
  },
};
