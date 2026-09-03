const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// This workspace also contains web apps that use React 19, while Expo SDK 52
// uses React 18.  Pin every mobile bundle to this app's React copy so Metro
// cannot combine React 19 elements with the React 18 native renderer.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(__dirname, "node_modules/react"),
};

module.exports = config;
