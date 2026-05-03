# FCM Token Management Flow Documentation

## Overview
This document explains how FCM (Firebase Cloud Messaging) tokens are managed throughout the app lifecycle for the Chesa Sales App.

---

## 🔄 Complete Token Lifecycle

### 1️⃣ **User Logs In**
```
User Login → Token Generation → Token Registration → Notifications Enabled
```

**What Happens:**
1. User enters credentials and logs in
2. `NotificationContext` detects user login via `user.empid`
3. Requests notification permissions from device
4. Generates FCM token from Firebase
5. Automatically registers token with backend
6. Stores registration status locally

**Code Flow:**
```javascript
// In NotificationContext.js
useEffect(() => {
  const registerToken = async () => {
    if (user?.empid) {
      console.log('User logged in, registering FCM token...');
      const tokens = await registerForPushNotificationsAsync();

      if (tokens) {
        setExpoPushToken(tokens.expoPushToken);
        setFcmToken(tokens.fcmToken);
        await registerTokenWithBackend(tokens.fcmToken, user.empid);
      }
    }
  };

  registerToken();
}, [user?.empid]); // Triggers on login
```

**Backend Action:**
```sql
-- If token exists: UPDATE
UPDATE fcm_tokens
SET is_active = TRUE,
    updated_at = NOW(),
    last_used_at = NOW()
WHERE emp_id = ? AND fcm_token = ?

-- If new token: INSERT
INSERT INTO fcm_tokens
(emp_id, fcm_token, device_type, device_info, last_used_at)
VALUES (?, ?, ?, ?, NOW())
```

---

### 2️⃣ **App Launch (User Already Logged In)**
```
App Start → Check Login Status → Re-register Token → Updated in DB
```

**What Happens:**
1. App starts and loads user from AsyncStorage
2. `NotificationContext` detects existing user
3. Re-requests FCM token (may have changed)
4. Updates token in backend database
5. Ensures latest token is always stored

**Why This is Important:**
- FCM tokens can change without notice
- Ensures token is always up-to-date
- Handles token refresh automatically
- Prevents missed notifications

**Code Flow:**
```javascript
// Every app launch with logged-in user
if (user?.empid) {
  // Get fresh token
  const tokens = await registerForPushNotificationsAsync();

  // Update backend (inserts new or updates existing)
  await registerTokenWithBackend(tokens.fcmToken, user.empid);
}
```

---

### 3️⃣ **User Logs Out**
```
Logout Initiated → Deactivate Token → Clear Local Data → Navigate to Login
```

**What Happens:**
1. User clicks logout button
2. Confirmation dialog shown
3. FCM token deactivated in backend
4. Local storage cleared
5. User navigated to login screen

**Code Flow:**
```javascript
// In LogoutButton.js
const performLogout = async () => {
  try {
    // 1. Deactivate FCM token first
    await deactivateToken();

    // 2. Clear all local data
    await clearAsyncStorageData();

    // 3. Call auth logout
    await logout();

    // 4. Navigate to login
    router.replace('/auth');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

**Backend Action:**
```sql
-- Mark token as inactive
UPDATE fcm_tokens
SET is_active = FALSE,
    updated_at = NOW()
WHERE fcm_token = ?
```

**Why Deactivate:**
- Prevents notifications to logged-out users
- Security best practice
- Keeps database clean
- Allows accurate user counts

---

### 4️⃣ **Token Refresh (Automatic)**
```
Token Changes → Auto-detected → Re-registered → DB Updated
```

**What Happens:**
- Firebase may refresh tokens periodically
- When detected, automatically updates backend
- User doesn't see any change
- Seamless background process

---

## 📱 User Experience Flow

### First Time User

```
1. Download App
   ↓
2. Open App → Welcome Screen
   ↓
3. Login with Credentials
   ↓
4. Permission Dialog: "Allow notifications?"
   ↓
5. User Taps "Allow"
   ↓
6. Token Generated & Registered
   ↓
7. Ready to receive notifications! ✅
```

### Returning User

```
1. Open App
   ↓
2. Auto-login (if session valid)
   ↓
3. Token automatically re-registered in background
   ↓
4. Ready to receive notifications! ✅
```

### Logout Flow

```
1. User taps "Logout"
   ↓
2. Confirmation: "Are you sure?"
   ↓
3. User confirms
   ↓
4. Token deactivated in backend
   ↓
5. Local data cleared
   ↓
6. Redirected to Login screen
   ↓
7. No more notifications until next login ✅
```

---

## 🔐 Security & Privacy

### Token Storage
- **Client Side:** Stored in React state (memory only)
- **Backend:** Stored in encrypted database
- **Cleared On:** Logout, token deactivation

### Data Included with Token
```javascript
{
  fcmToken: "encrypted_token_string",
  empId: "EMP001",
  deviceType: "android" | "ios",
  deviceInfo: {
    brand: "Samsung",
    modelName: "Galaxy S21",
    osName: "Android",
    osVersion: "12"
  }
}
```

### Privacy Considerations
- ✅ Token only registered when user is logged in
- ✅ Token deactivated immediately on logout
- ✅ No personal data in token itself
- ✅ Token can only be used for notifications
- ✅ Cannot be used to access user data

---

## 💾 Database Schema

### fcm_tokens Table
```sql
CREATE TABLE fcm_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  emp_id VARCHAR(50) NOT NULL,           -- Employee ID
  fcm_token TEXT NOT NULL,               -- Firebase token
  device_type ENUM('ios', 'android'),    -- Platform
  device_info JSON,                       -- Device details
  is_active BOOLEAN DEFAULT TRUE,         -- Active status
  created_at TIMESTAMP,                   -- First registration
  updated_at TIMESTAMP,                   -- Last update
  last_used_at TIMESTAMP                  -- Last app open
);
```

### Token States
| State | Meaning | When |
|-------|---------|------|
| `is_active = TRUE` | Token is valid | User logged in |
| `is_active = FALSE` | Token deactivated | User logged out |
| `last_used_at = NOW()` | Recently active | App opened |

---

## 🧪 Testing the Flow

### Test 1: Fresh Install
```bash
# Steps:
1. Install app on device
2. Login with employee ID
3. Allow notifications when prompted
4. Check database:
   SELECT * FROM fcm_tokens WHERE emp_id = 'YOUR_EMP_ID';
5. Should see 1 active token ✅
```

### Test 2: Re-open App
```bash
# Steps:
1. Close app completely
2. Re-open app
3. User auto-logged in
4. Check database:
   SELECT updated_at, last_used_at
   FROM fcm_tokens
   WHERE emp_id = 'YOUR_EMP_ID';
5. Timestamps should be recent ✅
```

### Test 3: Logout
```bash
# Steps:
1. Tap logout button
2. Confirm logout
3. Check database:
   SELECT is_active
   FROM fcm_tokens
   WHERE emp_id = 'YOUR_EMP_ID';
4. Should show is_active = FALSE ✅
```

### Test 4: Re-login
```bash
# Steps:
1. Login again with same credentials
2. Check database:
   SELECT is_active, updated_at
   FROM fcm_tokens
   WHERE emp_id = 'YOUR_EMP_ID';
3. Should show is_active = TRUE with new timestamp ✅
```

### Test 5: Send Notification
```bash
# After login, send test notification:
curl -X POST http://localhost:4000/notifications/send-to-employees \
  -H "Content-Type: application/json" \
  -d '{
    "empIds": ["YOUR_EMP_ID"],
    "title": "Test",
    "body": "Testing notification flow",
    "notificationType": "general"
  }'

# Should receive notification on device ✅
```

---

## 📊 Monitoring Queries

### Active Users Count
```sql
SELECT COUNT(DISTINCT emp_id) as active_users
FROM fcm_tokens
WHERE is_active = TRUE;
```

### Users by Device Type
```sql
SELECT
  device_type,
  COUNT(DISTINCT emp_id) as user_count
FROM fcm_tokens
WHERE is_active = TRUE
GROUP BY device_type;
```

### Recent Logins
```sql
SELECT
  emp_id,
  device_type,
  last_used_at
FROM fcm_tokens
WHERE is_active = TRUE
ORDER BY last_used_at DESC
LIMIT 20;
```

### Token Registration Rate
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_registrations
FROM fcm_tokens
WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🚨 Troubleshooting

### Issue: Token Not Registering

**Symptoms:**
- User logged in but no token in database
- Console shows errors

**Checks:**
```javascript
// Check console logs
console.log('User empid:', user?.empid); // Should be defined
console.log('FCM token:', fcmToken);     // Should be a long string
```

**Solutions:**
1. Verify user object has `empid` field
2. Check notification permissions enabled
3. Verify backend is running
4. Check network connectivity

---

### Issue: Token Not Updating

**Symptoms:**
- Old `updated_at` timestamp
- `last_used_at` not changing

**Checks:**
```sql
-- Check token status
SELECT emp_id, updated_at, last_used_at, is_active
FROM fcm_tokens
WHERE emp_id = 'YOUR_EMP_ID';
```

**Solutions:**
1. Ensure user opens app (doesn't just resume)
2. Check `useEffect` dependency in NotificationContext
3. Verify backend endpoint is working

---

### Issue: Still Getting Notifications After Logout

**Symptoms:**
- User logged out but receives notifications

**Checks:**
```sql
-- Verify token is deactivated
SELECT is_active FROM fcm_tokens WHERE emp_id = 'YOUR_EMP_ID';
-- Should be FALSE
```

**Solutions:**
1. Check `deactivateToken()` is being called
2. Verify backend deactivation endpoint
3. Check for multiple active tokens

---

## 🎯 Best Practices

### For Developers

1. **Always Update on Login:**
   - Re-register token every app launch
   - Don't rely on stored tokens
   - Assume tokens can change

2. **Always Deactivate on Logout:**
   - Security requirement
   - Privacy best practice
   - Prevents notification leaks

3. **Handle Errors Gracefully:**
   - Don't block login if token fails
   - Log errors for debugging
   - Retry failed registrations

4. **Monitor Database:**
   - Check active token counts
   - Review registration patterns
   - Clean up old inactive tokens periodically

### For Users

1. **Allow Notifications:**
   - Required for receiving updates
   - Can be changed in device settings later

2. **Keep App Updated:**
   - Ensures latest token management
   - Improves reliability

3. **Re-login if Issues:**
   - Fresh token registration
   - Often fixes notification problems

---

## 📝 Summary

**Token Registration:**
- ✅ Automatic on login
- ✅ Re-registered on every app launch
- ✅ Updated in backend database
- ✅ Includes device information

**Token Deactivation:**
- ✅ Automatic on logout
- ✅ Marked inactive in database
- ✅ Local data cleared
- ✅ No more notifications

**Key Benefits:**
- ✅ Always up-to-date tokens
- ✅ Automatic token refresh
- ✅ Secure logout process
- ✅ Accurate user tracking
- ✅ Reliable notifications

---

## 🔗 Related Documentation

- **API Documentation:** `D:\chesa_api_gateway\docs\PUSH_NOTIFICATIONS_API.md`
- **Setup Guide:** `D:\sales-app\PUSH_NOTIFICATIONS_SETUP.md`
- **Deployment Guide:** `D:\sales-app\DEPLOYMENT_GUIDE.md`
- **Quick Reference:** `D:\API_ENDPOINTS_QUICK_REFERENCE.md`

---

**Last Updated:** January 2025
**Version:** 6.3.0
