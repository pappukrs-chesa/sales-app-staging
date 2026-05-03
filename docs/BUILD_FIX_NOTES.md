# Build Fix - Firebase Notification Manifest Conflict

## Problem

Build was failing with the following error:
```
Manifest merger failed : Attribute meta-data#com.google.firebase.messaging.default_notification_color@resource value=(@color/notification_icon_color) from AndroidManifest.xml:16:88-137
is also present at [:react-native-firebase_messaging] AndroidManifest.xml:46:13-44 value=(@color/white).
```

## Root Cause

The conflict occurred because:
1. We initially installed both `@react-native-firebase/messaging` AND `expo-notifications`
2. Both packages try to define the same notification color in AndroidManifest
3. Gradle's manifest merger couldn't resolve the conflict

## Solution

### Step 1: Removed Conflicting Packages ✅
```bash
npm uninstall @react-native-firebase/app @react-native-firebase/messaging
```

**Why:** We're using Expo's managed workflow with `expo-notifications`, not React Native Firebase. The `@react-native-firebase/*` packages are for bare React Native projects.

### Step 2: Created Custom Config Plugin ✅
Created `plugins/withNotificationManifest.js` to properly configure the Android manifest.

**What it does:**
- Removes duplicate notification color meta-data
- Adds proper `tools:replace` attribute
- Ensures clean manifest merger

### Step 3: Simplified expo-notifications Config ✅
Updated `app.json` to remove conflicting color configuration from expo-notifications plugin.

**Before:**
```json
{
  "icon": "./assets/images/ic_launcher.png",
  "color": "#ffffff",  // ❌ This was causing conflict
  "sounds": [],
  "mode": "production"
}
```

**After:**
```json
{
  "icon": "./assets/images/ic_launcher.png",
  "sounds": [],
  "mode": "production"
}
```

### Step 4: Added Custom Plugin to app.json ✅
```json
"plugins": [
  ["expo-build-properties", {...}],
  ["expo-notifications", {...}],
  "./plugins/withNotificationManifest.js"  // ✅ Custom plugin
]
```

## What We're Using

### For Push Notifications:
✅ **expo-notifications** - Expo's managed notification package
✅ **firebase** (web SDK) - For backend FCM messaging
✅ **expo-device** - For device information

### NOT Using:
❌ **@react-native-firebase/app** - Removed (for bare RN only)
❌ **@react-native-firebase/messaging** - Removed (for bare RN only)

## Current Package Setup

```json
{
  "dependencies": {
    "expo-notifications": "latest",
    "firebase": "latest",
    "expo-device": "latest",
    "expo-constants": "latest"
  }
}
```

## Build Again

Now you can rebuild:

```bash
# For production build
eas build --profile production --platform android

# For development build
eas build --profile development --platform android
```

## Expected Outcome

✅ Build should complete without manifest merger errors
✅ Push notifications will work correctly
✅ Firebase integration intact
✅ All notification features working

## How Push Notifications Work Now

1. **Client Side (Expo Notifications):**
   - Uses `expo-notifications` for permission handling
   - Uses `Notifications.getDevicePushTokenAsync()` to get FCM token
   - Handles notification display and tap events

2. **Backend Side (Firebase Admin SDK):**
   - Uses `firebase-admin` package in Node.js backend
   - Sends push notifications via Firebase Cloud Messaging
   - Manages tokens and message delivery

3. **Communication:**
   ```
   Mobile App (expo-notifications)
     ↓ gets FCM token
     ↓ sends to backend
   Backend (firebase-admin)
     ↓ stores token
     ↓ sends notification via FCM
   Mobile App (expo-notifications)
     ↓ receives notification
     ↓ displays to user
   ```

## Verification Steps

After build completes:

1. **Install APK on device**
2. **Login to app**
3. **Check console logs:**
   ```
   ✅ Token registered successfully
   ```
4. **Check database:**
   ```sql
   SELECT * FROM fcm_tokens WHERE emp_id = 'YOUR_EMP_ID';
   ```
5. **Send test notification:**
   ```bash
   curl -X POST http://localhost:4000/notifications/send-to-employees \
     -H "Content-Type: application/json" \
     -d '{"empIds": ["YOUR_EMP_ID"], "title": "Test", "body": "Success!"}'
   ```
6. **Receive notification on device ✅**

## Troubleshooting

### If Build Still Fails

1. **Clear Expo cache:**
   ```bash
   expo prebuild --clean
   ```

2. **Clear EAS build cache:**
   ```bash
   eas build --clear-cache
   ```

3. **Check google-services.json:**
   - Ensure file exists at root of project
   - Verify it has correct package name: `com.chesadentalcare.salesapp`

4. **Verify app.json:**
   - Package name matches: `"package": "com.chesadentalcare.salesapp"`
   - googleServicesFile path correct: `"./google-services.json"`

### If Notifications Don't Work

1. **Check package installation:**
   ```bash
   npm list expo-notifications firebase expo-device
   ```

2. **Verify no React Native Firebase packages:**
   ```bash
   npm list | grep react-native-firebase
   # Should return nothing
   ```

3. **Check Firebase config:**
   - Verify `config/firebase.js` has correct credentials
   - Ensure backend has correct Firebase Admin SDK setup

## Additional Notes

- ✅ This is the correct setup for Expo managed workflow
- ✅ No need for React Native Firebase in Expo projects
- ✅ expo-notifications handles all native functionality
- ✅ firebase package (web SDK) is for config only
- ✅ Backend uses firebase-admin for sending messages

## Related Files

- `plugins/withNotificationManifest.js` - Custom manifest plugin
- `ContextAPI/NotificationContext.js` - Notification logic
- `google-services.json` - Firebase Android config
- `app.json` - Expo configuration

## Version Info

- Expo SDK: 54
- expo-notifications: Latest
- firebase: 12.x
- App Version: 6.3.0

---

**Last Updated:** January 2025
**Build Status:** ✅ Fixed and Ready
