const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Optimize CSS for production
    ...(process.env.NODE_ENV === "production" && {
      cssnano: {
        preset: [
          "default",
          {
            // Optimize CSS minification
            discardComments: {
              removeAll: true,
            },
            normalizeWhitespace: true,
            mergeLonghand: true,
            mergeRules: true,
            minifySelectors: true,
          },
        ],
      },
    }),
  },
};

export default config;
