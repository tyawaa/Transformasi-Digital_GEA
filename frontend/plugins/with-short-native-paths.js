const { withAppBuildGradle } = require("expo/config-plugins");

/** @param {string} contents @returns {string} */
function shortenNativePaths(contents) {
  if (contents.includes("// gea-short-native-paths")) return contents;
  const anchor = /^android \{$/m;
  if (!anchor.test(contents)) throw new Error("Blok android pada app/build.gradle tidak ditemukan; periksa template Expo sebelum build APK.");
  return contents.replace(anchor, `android {
    // gea-short-native-paths
    externalNativeBuild {
        cmake { buildStagingDirectory file("../../../.cxx/gea") }
    }
    defaultConfig {
        externalNativeBuild {
            cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=240" }
        }
    }`);
}

/** @type {import("expo/config-plugins").ConfigPlugin} */
const withShortNativePaths = (config) => withAppBuildGradle(config, (gradleConfig) => ({
  ...gradleConfig,
  modResults: { ...gradleConfig.modResults, contents: shortenNativePaths(gradleConfig.modResults.contents) },
}));

module.exports = withShortNativePaths;
