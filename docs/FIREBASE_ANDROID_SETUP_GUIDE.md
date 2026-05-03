# Firebase Android App Setup Guide

## Current Issue
Error: `Default FirebaseApp is not initialized in this process com.chesadentalcare.salesapp`

**Root Cause:** The `google-services.json` file is not properly configured for the Android app.

---

## Step-by-Step Fix

### 1. Open Firebase Console
Visit: https://console.firebase.google.com/project/chesa-dashboards

### 2. Add Android App (or verify existing)

#### Check if Android app exists:
1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Look for an Android app with package: `com.chesadentalcare.salesapp`

#### If Android app doesn't exist, add it:
1. Click "Add app" button
2. Select Android icon
3. Fill in:
   - **Android package name:** `com.chesadentalcare.salesapp`
   - **App nickname (optional):** Chesa Sales App
   - **Debug signing certificate SHA-1 (optional):** Leave blank for now
4. Click "Register app"

### 3. Download google-services.json

1. After registering (or from existing Android app settings)
2. Click "Download google-services.json"
3. **IMPORTANT:** Verify the file contains:
   ```json
   {
     "project_info": {
       "project_number": "442787713847",
       "project_id": "chesa-dashboards"
     },
     "client": [
       {
         "client_info": {
           "mobilesdk_app_id": "1:442787713847:android:XXXXX", // Should say 'android'
           "android_client_info": {
             "package_name": "com.chesadentalcare.salesapp"
           }
         }
       }
     ]
   }
   ```

4. Replace the file at: `D:\sales-app\google-services.json`

### 4. Enable Firebase Cloud Messaging API

#### Option A: Enable Cloud Messaging API (V1) - **RECOMMENDED**
1. Go to Firebase Console → Project Settings
2. Click "Cloud Messaging" tab
3. Under "Cloud Messaging API (V1)", click "Manage API in Google Cloud Console"
4. Click "Enable" button
5. This is the modern API and what Firebase Admin SDK uses

#### Option B: Enable Legacy API (Not Recommended)
1. Same location as above
2. Enable "Cloud Messaging API (Legacy)"
3. Note: This API is deprecated and will be removed

**Note:** The Firebase Admin SDK (which we use in backend) automatically uses V1 API, so enabling V1 is preferred.

### 5. Verify SHA-1 Certificate (Optional but recommended for production)

#### Get SHA-1 from EAS:
```bash
cd D:\sales-app
eas credentials -p android
```

#### Add SHA-1 to Firebase:
1. In Firebase Console → Project Settings → Your Android App
2. Scroll to "SHA certificate fingerprints"
3. Click "Add fingerprint"
4. Paste the SHA-1 from EAS credentials

### 6. Rebuild the App

After replacing `google-services.json`:

```bash
cd D:\sales-app

# Clear cache
rm -rf node_modules/.cache
rm -rf .expo

# Rebuild
eas build --profile production --platform android --clear-cache
```

---

## Verification Checklist

After rebuild and install:

- [ ] App logs show: `✅ Device Push Token (FCM): [long_token_string]`
- [ ] No error: `Default FirebaseApp is not initialized`
- [ ] Token saved to database (check with verify-fcm-setup.js)
- [ ] Backend can send notifications successfully

---

## Troubleshooting

### If you still see "FirebaseApp not initialized" error:

1. **Verify package name matches:**
   - app.json: `"package": "com.chesadentalcare.salesapp"`
   - google-services.json: `"package_name": "com.chesadentalcare.salesapp"`

2. **Check google-services.json is valid:**
   ```bash
   cat D:\sales-app\google-services.json | grep "package_name"
   ```
   Should output: `"package_name": "com.chesadentalcare.salesapp"`

3. **Ensure it's referenced in app.json:**
   ```json
   "plugins": [
     ["expo-build-properties", {
       "android": {
         "googleServicesFile": "./google-services.json"
       }
     }]
   ]
   ```

4. **Clear EAS build cache:**
   ```bash
   eas build --profile production --platform android --clear-cache
   ```

### If backend can't send notifications:

1. **Check Firebase Admin SDK credentials in .env:**
   - FIREBASE_PRIVATE_KEY
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PROJECT_ID

2. **Verify FCM API is enabled in Google Cloud Console:**
   https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=chesa-dashboards

---

## Quick Reference

**Firebase Console:**
https://console.firebase.google.com/project/chesa-dashboards

**Google Cloud Console (for API):**
https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=chesa-dashboards

**Package Name:**
`com.chesadentalcare.salesapp`

**Project ID:**
`chesa-dashboards`

**Project Number:**
`442787713847`
