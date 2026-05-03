# Push Notifications Setup Guide for Chesa Sales App

## Overview
This guide will help you set up and test Firebase push notifications in the Chesa Sales App.

---

## Prerequisites

1. Firebase project: `chesa-dashboards`
2. Android/iOS device (emulators don't support push notifications properly)
3. EAS Build or development build with expo-notifications

---

## Installation Steps

### 1. Dependencies (Already Installed)
The following packages have been installed:
- `expo-notifications`
- `firebase`
- `@react-native-firebase/app`
- `@react-native-firebase/messaging`

### 2. Configuration Files Created

#### Mobile App (D:\sales-app)
- `config/firebase.js` - Firebase configuration
- `google-services.json` - Android Firebase config
- `ContextAPI/NotificationContext.js` - Notification management
- `app.json` - Updated with notification plugins

#### Backend (D:\chesa_api_gateway)
- `src/apis/notifications/TokenManagement.js` - Token registration APIs
- `src/apis/notifications/PushNotificationService.js` - Notification sending APIs
- `docs/database/fcm_tokens_table.sql` - Database schema

---

## Database Setup

### Step 1: Create Database Tables
Run the following SQL on your `sales` database:

```bash
# Connect to your MySQL database
mysql -u chesa -p sales

# Run the migration script
source D:/chesa_api_gateway/docs/database/fcm_tokens_table.sql
```

Or manually execute:

```sql
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  fcm_token TEXT NOT NULL,
  device_type ENUM('ios', 'android', 'web') NOT NULL,
  device_info JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  INDEX idx_emp_id (emp_id),
  INDEX idx_is_active (is_active),
  UNIQUE KEY unique_emp_device (emp_id, fcm_token(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSON,
  recipients JSON NOT NULL,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  response_details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_by VARCHAR(50),
  INDEX idx_notification_type (notification_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Building the App

### For Android

1. **Create a development build:**
```bash
cd D:\sales-app
eas build --profile development --platform android
```

2. **Or create a production build:**
```bash
eas build --profile production --platform android
```

3. **Install the build on your Android device**

### For iOS

1. **Add iOS GoogleService-Info.plist** (if not already added):
   - Download from Firebase Console
   - Place in `D:\sales-app\` directory

2. **Create build:**
```bash
eas build --profile production --platform ios
```

---

## Testing Push Notifications

### Step 1: Start the Backend Server
```bash
cd D:\chesa_api_gateway
npm start
```

The server should be running on `http://localhost:4000`

### Step 2: Install and Login to the App
1. Install the app on a physical device
2. Login with a valid employee ID
3. The app will automatically register the FCM token

### Step 3: Verify Token Registration

Check if the token was registered:
```bash
curl http://localhost:4000/notifications/tokens/YOUR_EMP_ID
```

Or check in database:
```sql
SELECT * FROM fcm_tokens WHERE emp_id = 'YOUR_EMP_ID';
```

### Step 4: Send a Test Notification

**Using cURL:**
```bash
curl -X POST http://localhost:4000/notifications/send-to-employees \
  -H "Content-Type: application/json" \
  -d '{
    "empIds": ["YOUR_EMP_ID"],
    "title": "Test Notification",
    "body": "This is a test push notification from the backend!",
    "data": {
      "test": true
    },
    "notificationType": "general"
  }'
```

**Using Postman:**
1. Create a POST request to `http://localhost:4000/notifications/send-to-employees`
2. Set Content-Type header to `application/json`
3. Use the body from the cURL example above
4. Send the request

---

## Common Use Cases

### 1. Send Order Status Update
```bash
curl -X POST http://localhost:4000/notifications/order-status \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "12345",
    "orderNumber": "SO-2025-001",
    "status": "Dispatched",
    "empIds": ["YOUR_EMP_ID"],
    "additionalData": {
      "customerName": "Test Customer",
      "trackingNumber": "TRK123"
    }
  }'
```

### 2. Broadcast to All Employees
```bash
curl -X POST http://localhost:4000/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Important Announcement",
    "body": "Team meeting at 3 PM today",
    "data": {
      "meetingId": "MTG001"
    },
    "notificationType": "announcement"
  }'
```

### 3. Send New Offer Notification
```bash
curl -X POST http://localhost:4000/notifications/offer \
  -H "Content-Type: application/json" \
  -d '{
    "offerTitle": "Special Discount - 20% Off",
    "offerDescription": "Limited time offer on all products!",
    "offerData": {
      "validUntil": "2025-01-31",
      "discountPercent": 20
    },
    "empIds": ["YOUR_EMP_ID"]
  }'
```

---

## Troubleshooting

### Issue: No Token Being Registered

**Check:**
1. Are you using a physical device? (Emulators don't support FCM properly)
2. Check app logs for any errors
3. Verify internet connection
4. Check Firebase project configuration

**Debug:**
```javascript
// In NotificationContext.js, check console logs
console.log('FCM Token:', fcmToken);
```

### Issue: Notifications Not Received

**Check:**
1. Is the app in foreground or background?
2. Are notifications enabled in device settings?
3. Is the FCM token active in database?
4. Check notification history for delivery status

**Verify:**
```sql
-- Check if token is active
SELECT * FROM fcm_tokens WHERE emp_id = 'YOUR_EMP_ID' AND is_active = TRUE;

-- Check notification logs
SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10;
```

### Issue: Backend API Not Accessible

**If using localhost from mobile device:**
1. Find your computer's IP address:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig`

2. Update the API URL in `NotificationContext.js`:
```javascript
const API_URL = 'http://192.168.X.X:4000'; // Replace with your IP
```

3. Ensure your computer and mobile device are on the same network

---

## Production Deployment

### 1. Update API URLs
Replace `localhost` with your production API URL in:
- `D:\sales-app\ContextAPI\NotificationContext.js`

### 2. Environment Variables
Consider using environment variables for API URLs:

```javascript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
```

### 3. Build Production App
```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

---

## Monitoring

### View Notification History
```bash
curl http://localhost:4000/notifications/history?limit=50
```

### View Active Tokens
```bash
curl http://localhost:4000/notifications/tokens
```

### Database Queries
```sql
-- Total active tokens
SELECT COUNT(*) as total_devices FROM fcm_tokens WHERE is_active = TRUE;

-- Tokens by device type
SELECT device_type, COUNT(*) as count
FROM fcm_tokens
WHERE is_active = TRUE
GROUP BY device_type;

-- Recent notifications
SELECT notification_type, title, success_count, failure_count, created_at
FROM notification_logs
ORDER BY created_at DESC
LIMIT 20;

-- Notification success rate
SELECT
  notification_type,
  SUM(success_count) as total_success,
  SUM(failure_count) as total_failure,
  ROUND(SUM(success_count) * 100.0 / (SUM(success_count) + SUM(failure_count)), 2) as success_rate
FROM notification_logs
GROUP BY notification_type;
```

---

## API Endpoints Reference

All notification endpoints are documented in:
`D:\chesa_api_gateway\docs\PUSH_NOTIFICATIONS_API.md`

**Quick Reference:**
- `POST /notifications/register-token` - Register FCM token
- `POST /notifications/send-to-employees` - Send to specific employees
- `POST /notifications/order-status` - Order status update
- `POST /notifications/offer` - New offer notification
- `POST /notifications/broadcast` - Broadcast to all
- `GET /notifications/history` - View notification history

---

## Next Steps

1. ✅ Database tables created
2. ✅ Backend APIs deployed
3. ✅ Mobile app built with notifications
4. ✅ Test notifications working
5. 📝 Integrate with existing order/lead workflows
6. 📝 Set up automated notifications for key events
7. 📝 Monitor notification delivery rates
8. 📝 Gather user feedback

---

## Support

For issues or questions:
1. Check the comprehensive API documentation: `D:\chesa_api_gateway\docs\PUSH_NOTIFICATIONS_API.md`
2. Review notification logs in database
3. Check Firebase Console for service status
4. Review application logs for detailed errors
