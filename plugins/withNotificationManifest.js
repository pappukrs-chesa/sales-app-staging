const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Custom Expo config plugin to fix Firebase notification manifest conflicts
 */
module.exports = function withNotificationManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Find and update the notification color meta-data
    const metaDataArray = mainApplication['meta-data'] || [];

    // Remove any existing notification_icon_color meta-data to avoid conflicts
    const filteredMetaData = metaDataArray.filter(
      item => item.$['android:name'] !== 'com.google.firebase.messaging.default_notification_color'
    );

    // Add our notification color configuration
    filteredMetaData.push({
      $: {
        'android:name': 'com.google.firebase.messaging.default_notification_color',
        'android:resource': '@color/notification_icon_color',
        'tools:replace': 'android:resource'
      }
    });

    mainApplication['meta-data'] = filteredMetaData;

    // Add tools namespace to manifest if not present
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    return config;
  });
};
