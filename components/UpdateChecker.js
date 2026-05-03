import React, { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * UpdateChecker Component
 *
 * Automatically checks for OTA updates when the app starts.
 * If an update is available:
 * 1. Downloads it in the background
 * 2. Shows an alert asking user to restart
 * 3. Applies update on restart
 *
 * Usage: Add <UpdateChecker /> to your root app component
 */
const UpdateChecker = () => {
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    // Don't check for updates in development mode
    if (__DEV__) {
      console.log('📱 Update check skipped - running in development mode');
      return;
    }

    // Don't check if not running from an update-enabled build
    if (!Updates.isEnabled) {
      console.log('📱 Updates are not enabled in this build');
      return;
    }

    // Prevent multiple simultaneous checks
    if (isChecking) {
      return;
    }

    setIsChecking(true);

    try {
      console.log('📱 Checking for updates...');

      // Check if an update is available
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('✅ Update available! Downloading...');

        // Download the update
        await Updates.fetchUpdateAsync();

        console.log('✅ Update downloaded successfully!');

        // Show alert to user
        Alert.alert(
          '🎉 Update Available',
          'A new version of the app has been downloaded. Please restart to apply the changes.',
          [
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => {
                console.log('📱 User chose to update later');
              }
            },
            {
              text: 'Restart Now',
              onPress: async () => {
                console.log('📱 Restarting app to apply update...');
                try {
                  await Updates.reloadAsync();
                } catch (error) {
                  console.error('Error restarting app:', error);
                  Alert.alert(
                    'Error',
                    'Failed to restart the app. Please close and reopen manually.'
                  );
                }
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        console.log('✅ App is up to date!');
      }
    } catch (error) {
      // Log error but don't show to user (fail silently)
      console.error('📱 Error checking for updates:', error);

      // Optionally show error in development
      if (__DEV__) {
        Alert.alert('Update Check Failed', error.message);
      }
    } finally {
      setIsChecking(false);
    }
  };

  // This component doesn't render anything
  return null;
};

export default UpdateChecker;
