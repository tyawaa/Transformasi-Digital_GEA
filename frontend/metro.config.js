const { resolve } = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {ReturnType<typeof getDefaultConfig>} */
const baseConfig = getDefaultConfig(__dirname);

module.exports = {
  ...baseConfig,
  watchFolders: [...baseConfig.watchFolders, resolve(__dirname, "../backend/data")],
};
