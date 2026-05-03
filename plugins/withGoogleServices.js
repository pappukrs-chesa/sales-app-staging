const { withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Expo config plugin to copy google-services.json to android/app
 * This runs after the android directory is created but before the build
 */
module.exports = function withGoogleServices(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;

      const googleServicesPath = path.join(projectRoot, 'google-services.json');
      const androidAppPath = path.join(platformRoot, 'app', 'google-services.json');

      // Check if google-services.json exists in project root
      if (fs.existsSync(googleServicesPath)) {
        // Ensure android/app directory exists
        const androidAppDir = path.dirname(androidAppPath);
        if (!fs.existsSync(androidAppDir)) {
          fs.mkdirSync(androidAppDir, { recursive: true });
        }

        // Copy google-services.json to android/app
        fs.copyFileSync(googleServicesPath, androidAppPath);
        console.log('✅ google-services.json copied to android/app/');
        console.log(`   Source: ${googleServicesPath}`);
        console.log(`   Destination: ${androidAppPath}`);
      } else {
        console.error('❌ google-services.json not found in project root!');
        console.error(`   Expected location: ${googleServicesPath}`);
        throw new Error('google-services.json is required but not found in project root');
      }

      return config;
    },
  ]);
};
