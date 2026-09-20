module.exports = {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: ["src/**/*.{ts,tsx}"],
      useCSSLayers: true,
      babelConfig: {
        babelrc: false,
        parserOpts: { plugins: ["typescript", "jsx"] },
        // Next.js loads this config as CommonJS.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        plugins: require("./babel.config").plugins,
      },
    },
  },
};
