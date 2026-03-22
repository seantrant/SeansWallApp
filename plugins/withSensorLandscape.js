const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Config plugin that sets the main Activity orientation to "sensorLandscape"
 * so the screen rotates between both landscape directions (normal & reverse)
 * but never enters portrait.
 */
function withSensorLandscape(config) {
  return withAndroidManifest(config, (modConfig) => {
    const mainActivity =
      modConfig.modResults.manifest.application?.[0]?.activity?.find(
        (a) => a.$['android:name'] === '.MainActivity',
      );

    if (mainActivity) {
      mainActivity.$['android:screenOrientation'] = 'sensorLandscape';
    }

    return modConfig;
  });
}

module.exports = withSensorLandscape;
