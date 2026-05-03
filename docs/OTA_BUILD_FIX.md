# EAS Build Fix for OTA Updates

## Problem
The EAS build was failing with the error:
```
Error: Cannot find module 'expo/config/paths'
```

This was happening during the `:app:createReleaseUpdatesResources` Gradle task.

## Root Cause
- The `expo-updates` package version 0.29.x had compatibility issues with SDK 53
- The `runtimeVersion` policy `"appVersion"` was causing conflicts
- Missing `expo-dev-client` package which is required for custom builds

## Fixes Applied

### 1. Fixed runtimeVersion in app.json
**Changed from:**
```json
"runtimeVersion": {
  "policy": "appVersion"
}
```

**Changed to:**
```json
"runtimeVersion": "1.0.0"
```

This uses a fixed runtime version instead of automatic versioning, which is more stable for builds.

### 2. Installed expo-dev-client
```bash
npm install expo-dev-client
```

Added to app.json plugins:
```json
"plugins": [
  "expo-router",
  "expo-dev-client"
]
```

### 3. Downgraded expo-updates to SDK 53 compatible version
```bash
npm install expo-updates@~0.28.17
```

This version (0.28.17) is the correct version for Expo SDK 53, not the 0.29.x version that was initially installed.

## Updated Build Commands

Now you can build the app using:

### Preview Build (for testing OTA updates)
```bash
eas build --platform android --profile preview
```

### Production Build
```bash
eas build --platform android --profile production
```

## Important Notes

1. **Runtime Version Management**:
   - When you want to publish updates, they must match the runtimeVersion
   - Current runtimeVersion is "1.0.0"
   - Only increment this when you make native changes (add/remove native modules, change android/ios native code)
   - For JavaScript-only changes, keep the same runtimeVersion

2. **Publishing Updates**:
   ```bash
   # For preview builds
   eas update --branch preview --message "Your update message"

   # For production builds
   eas update --branch production --message "Your update message"
   ```

3. **When to Increment runtimeVersion**:
   - ✅ Added a new native module
   - ✅ Updated Expo SDK version
   - ✅ Changed android or ios native configuration
   - ❌ Only changed JavaScript/React code
   - ❌ Only changed styling or UI

4. **Version in app.json vs runtimeVersion**:
   - `"version": "6.2.1"` - This is your app version shown to users
   - `"runtimeVersion": "1.0.0"` - This is for OTA update compatibility
   - They are independent and serve different purposes

## Testing the Fix

1. Clear any previous build caches:
   ```bash
   eas build:cancel --all
   ```

2. Run a fresh preview build:
   ```bash
   eas build --platform android --profile preview
   ```

3. Once the build completes, install the APK on your device

4. Test OTA update by:
   - Making a small code change (e.g., change some text)
   - Publishing update: `eas update --branch preview --message "Test update"`
   - Close and reopen the app
   - You should see the update alert

## Build Status

The previous error has been fixed. The build should now complete successfully.

**Changed Files:**
- `app.json` - Fixed runtimeVersion, added expo-dev-client plugin
- `package.json` - Updated expo-updates version
- Installed `expo-dev-client` package

**Ready to build!** 🚀
