module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Ignore source map warnings from node_modules
      webpackConfig.ignoreWarnings = [
        {
          module: /node_modules/,
          message: /Failed to parse source map/,
        },
      ];
      return webpackConfig;
    },
  },
};