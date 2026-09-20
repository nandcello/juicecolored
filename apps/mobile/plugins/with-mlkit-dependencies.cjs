const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

// Camera and background removal both declare this metadata key. Preserve both
// model downloads while giving the app manifest precedence over the libraries.
module.exports = function withMlkitDependencies(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const name = "com.google.mlkit.vision.DEPENDENCIES";
    application["meta-data"] = [
      ...(application["meta-data"] ?? []).filter((item) => item.$["android:name"] !== name),
      {
        $: {
          "android:name": name,
          "android:value": "subject_segment,barcode_ui",
          "tools:replace": "android:value",
        },
      },
    ];
    return config;
  });
};
