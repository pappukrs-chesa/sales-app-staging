# FCM (Firebase Cloud Messaging) Fix Summary

## Problem
The app was failing to initialize Firebase on Android, resulting in the error:
```
Default FirebaseApp is not initialized in this process com.chesadentalcare.salesapp.
Make sure to call FirebaseApp.initializeApp(Context) first.
```

This prevented FCM tokens from being generated and saved to the backend.

## Root Causes

1. **Missing Firebase Native Initialization**: Firebase SDK wasn't being initialized in the Android native layer
2. **Missing Dependencies**: Firebase BOM and messaging libraries weren't included in build.gradle
3. **Missing Google Services Plugin**: The google-services.json wasn't being processed
4. **File Copy Issue**: google-services.json wasn't being copied to android/app in cloud builds
5. **Wrong Notification Mode**: expo-notifications was set to "preview" instead of "production"

## Solutions Implemented

### 1. Created Custom Expo Plugins

#### **plugins/withFirebaseInit.js**
- Adds Firebase BOM and messaging dependencies to `android/app/build.gradle`
- Adds Google Services classpath to `android/build.gradle`
- Applies google-services plugin
- Imports `com.google.firebase.FirebaseApp` in MainApplication.kt
- Adds `FirebaseApp.initializeApp(this)` call in onCreate method

#### **plugins/withGoogleServices.js**
- Uses `withDangerousMod` to copy google-services.json to android/app directory after prebuild
- Runs during the prebuild phase when the android directory is created
- Provides detailed logging for debugging
- Throws error if google-services.json is missing to fail early

### 2. Updated app.json

```json
{
  "plugins": [
    // ... other plugins
    [
      "expo-notifications",
      {
        "icon": "./assets/images/ic_launcher.png",
        "sounds": [],
        "mode": "production"  // Changed from "preview"
      }
    ],
    "./plugins/withNotificationManifest.js",
    "./plugins/withGoogleServices.js",
    "./plugins/withFirebaseInit.js"
  ]
}
```

### 3. Updated .gitignore

**IMPORTANT**: The google-services.json file is NOT ignored so it can be uploaded to EAS Build servers. Only the admin SDK file is ignored.

```
# Firebase credentials (IMPORTANT: Keep google-services.json tracked for EAS builds)
# google-services.json should be committed or uploaded to EAS
chesa-mobile-app-firebase-adminsdk-fbsvc-fdd5f18bda.json

# Android build
android/
ios/
```

**Note**: For security, consider using EAS Secrets to store google-services.json instead of committing it to git. However, for this implementation, the file must be present in the project for the plugin to copy it.

## Files Modified

1. **Created**:
   - `plugins/withFirebaseInit.js` - Complete Firebase setup plugin
   - `plugins/withGoogleServices.js` - Google services file copy plugin
   - `docs/FCM_FIX_SUMMARY.md` - This document

2. **Modified**:
   - `app.json` - Added plugins and fixed notification mode
   - `.gitignore` - Protected sensitive credentials

3. **Auto-generated (by plugins)**:
   - `android/build.gradle` - Google Services classpath added
   - `android/app/build.gradle` - Firebase dependencies and plugin added
   - `android/app/src/main/java/com/chesadentalcare/salesapp/MainApplication.kt` - Firebase initialization added
   - `android/app/google-services.json` - Copied from root

## Build Instructions

### Cloud Build (Recommended)
```bash
npx eas-cli build --platform android --profile preview
```

### Local Build (if Android Studio/Java is installed)
```bash
npx expo prebuild --clean --platform android
cd android
./gradlew assembleRelease
```

## Testing FCM

After installing the new APK:

1. **Check Logs**: Use `adb logcat` to verify Firebase initialization:
   ```bash
   adb logcat | grep -E "Firebase|FCM|ReactNativeJS"
   ```

2. **Expected Log Messages**:
   - ✅ "User logged in, registering FCM token for employee: [ID]"
   - ✅ "Device Push Token (FCM): [token]"
   - ✅ "Token registered successfully"

3. **Previous Error (should NOT appear)**:
   - ❌ "Default FirebaseApp is not initialized"

## Important Notes

1. **Notification Mode**: Must be "production" for FCM to work in preview/production builds
2. **Google Services File**: The google-services.json must exist in the project root
3. **Package Name**: Must match the one in google-services.json (`com.chesadentalcare.salesapp`)
4. **Prebuild Required**: Run `npx expo prebuild` whenever plugins are modified

## Verification Checklist

- [x] Firebase initialization plugin created
- [x] Google Services plugin created
- [x] app.json updated with plugins
- [x] Notification mode set to "production"
- [x] .gitignore updated to protect credentials
- [x] google-services.json in project root
- [x] Local prebuild tested successfully
- [ ] Cloud build completed successfully
- [ ] APK tested on physical device
- [ ] FCM tokens being generated and saved to backend

## Troubleshooting

If FCM still doesn't work after installing the new build:

1. **Verify Firebase config**: Check that google-services.json package name matches app.json
2. **Check permissions**: Ensure notification permissions are granted
3. **Review logs**: Look for Firebase-related errors in logcat
4. **Rebuild clean**: `npx expo prebuild --clean` and rebuild
5. **Verify backend**: Ensure the backend endpoint `/notifications/register-token` is working

## References

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
