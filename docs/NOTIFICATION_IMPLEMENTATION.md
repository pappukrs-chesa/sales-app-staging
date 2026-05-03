# Lead Follow-Up Notification System Implementation

## Overview
A comprehensive notification system has been implemented for the sales app to notify users about leads that are due for follow-up. The system integrates with SAP data, sends push notifications via FCM, stores notifications locally, and provides a notification center for viewing all notifications.

## Features Implemented

### 1. Backend API (D:\chesa_api_gateway)

#### New API Endpoints

**File:** `src/apis/notifications/LeadFollowUpNotifications.js`

Three main endpoints have been created:

1. **GET `/notifications/leads/today/:empCode`**
   - **Parameter:** `empCode` = EmployeeCode from `sale_staff` table (e.g., 6 for Sudhir Pujar, NOT the id 17)
   - Fetches leads due for follow-up today for a specific employee
   - Pulls data from SAP using OData API (SalesPerson field = EmployeeCode)
   - Filters leads where the last SalesOpportunitiesLines entry has ClosingDate = today
   - Enriches data with Business Partner information (customer name, phone, city)
   - Returns list of leads with details

2. **POST `/notifications/leads/send-reminders`**
   - Should be run via cron job every morning (e.g., 8:00 AM)
   - Queries `sale_staff` table for all employees with valid EmployeeCode
   - For each employee, checks SAP using their EmployeeCode (maps to SalesPerson in SAP)
   - Sends FCM push notifications to employees with follow-ups
   - Logs all notifications in MySQL database (notification_logs table)
   - Returns detailed results of notifications sent
   - **Note:** Uses EmployeeCode, NOT the id field

3. **GET `/notifications/employee/:empId`**
   - Retrieves notification history for a specific employee
   - Pulls from MySQL notification_logs table
   - Supports pagination (limit/offset)
   - Returns parsed JSON data

**Routes Added:** `src/routes/Routes.js`
```javascript
// Line 187
import { getTodayFollowUpLeads, sendFollowUpReminders, getEmployeeNotifications } from '../apis/notifications/LeadFollowUpNotifications.js';

// Lines 922-924
router.get('/notifications/leads/today/:empCode', checkSession('chesa_inc_live'), getTodayFollowUpLeads);
router.post('/notifications/leads/send-reminders', checkSession('chesa_inc_live'), sendFollowUpReminders);
router.get('/notifications/employee/:empId', getEmployeeNotifications);
```

### 2. Mobile App (D:\sales-app)

#### Notification Center UI

**File:** `app/(tabs)/notifications.js`

A complete notification center screen with:
- List of all received notifications
- Unread indicator (blue dot + highlighted background)
- Pull-to-refresh functionality
- Click to navigate to relevant lead/order
- Clear all notifications option
- Empty state with helpful message
- Timestamp showing "X minutes/hours/days ago"
- Icon based on notification type (calendar for follow-ups, cart for orders)

#### Local Notification Storage

**File:** `ContextAPI/NotificationContext.js`

Enhanced notification handling:
- `storeNotification()` function added
- Saves all incoming notifications to AsyncStorage
- Keeps last 50 notifications
- Stores: id, title, body, data, timestamp, read status
- Automatically called when notifications are received

#### Morning Follow-Up Check

**File:** `app/(tabs)/index.js`

Added `checkMorningFollowUps()` function:
- Runs when app opens for the first time each day
- Checks against `lastFollowUpCheck` in AsyncStorage to prevent duplicate checks
- Fetches employee's follow-up leads from API
- Shows Alert dialog if leads are found
- Stores notification locally for later viewing
- Non-blocking - won't prevent app from loading if API fails

#### Notification Click Handling

**File:** `ContextAPI/NotificationContext.js`

Updated `handleNotificationResponse()`:
- Routes to appropriate screen based on notification type
- Handles `lead_followup`, `Order`, `Lead`, and `offer` types
- Data structure preserved for navigation

## Data Flow

### 1. Scheduled Notification Flow (Daily)
```
Cron Job (8:00 AM)
    ↓
POST /notifications/leads/send-reminders
    ↓
Query MySQL for all sales employees
    ↓
For each employee:
  - Fetch leads from SAP where last ClosingDate = today
  - If leads found, get FCM tokens from MySQL
  - Send push notification via Firebase
  - Log to notification_logs table
    ↓
User receives notification on their device
    ↓
Notification stored in local AsyncStorage
```

### 2. App Open Flow (Morning)
```
User opens app
    ↓
checkMorningFollowUps() runs
    ↓
Check if already checked today
    ↓
GET /notifications/leads/today/:empCode
    ↓
If leads found:
  - Show Alert dialog
  - Store notification locally
  - Mark today as checked
```

### 3. Notification Center Flow
```
User taps Notification Center icon
    ↓
Load from AsyncStorage ('notifications' key)
    ↓
Display list of notifications
    ↓
User taps notification
    ↓
Mark as read
    ↓
Navigate to relevant screen based on type
```

## Database Schema

### MySQL Tables Used

#### `fcm_tokens` table
Stores FCM tokens for push notifications
- `id` - Primary key
- `emp_id` - Employee ID (foreign key to sales_employees)
- `fcm_token` - Firebase Cloud Messaging token
- `device_type` - iOS or Android
- `device_info` - JSON with device details
- `is_active` - Boolean
- `created_at`, `updated_at`, `last_used_at` - Timestamps

#### `notification_logs` table
Logs all sent notifications
- `id` - Primary key
- `notification_type` - e.g., 'lead_followup'
- `title` - Notification title
- `body` - Notification body text
- `data` - JSON with custom data
- `recipients` - JSON with recipient info
- `success_count` - Number of successful sends
- `failure_count` - Number of failed sends
- `response_details` - JSON with FCM responses
- `sent_by` - 'system' or user ID
- `created_at` - Timestamp

## SAP Data Structure

### SalesOpportunities (Leads)
- `SequentialNo` - Unique lead ID
- `CardCode` - Customer code (links to BusinessPartners)
- `SalesPerson` - Sales person code
- `InterestLevel` - Hot/Warm/Cold/Very Hot/Enquiry
- `Status` - 'sos_Open' for open leads
- `MaxLocalTotal` - Lead value
- `OpportunityName` - Optional name
- `SalesOpportunitiesLines[]` - Array of follow-up entries
  - `LineNum` - Line number
  - `ClosingDate` - Next follow-up date
  - `StageKey` - Stage/status code
  - `Remarks` - Follow-up notes

## AsyncStorage Keys Used

- `notifications` - Array of notification objects
- `lastFollowUpCheck` - Date string (YYYY-MM-DD) of last check
- `fcmTokenRegistered` - Boolean flag
- `lastTokenUpdate` - ISO timestamp of last token update
- `user` - User data object
- `sales_person` - Sales person name
- `role` - User role

## Setup Requirements

### 1. Cron Job Setup
Create a cron job to run daily at 8:00 AM:
```bash
0 8 * * * curl -X POST https://api.chesadentalcare.com/notifications/leads/send-reminders
```

Or use a Node.js scheduler:
```javascript
const cron = require('node-cron');

// Run every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  try {
    const response = await axios.post('https://api.chesadentalcare.com/notifications/leads/send-reminders');
    console.log('Daily follow-up reminders sent:', response.data);
  } catch (error) {
    console.error('Error sending daily reminders:', error);
  }
});
```

### 2. Navigation Setup
Add the notifications screen to your tab navigation:

```javascript
// In your tab navigation configuration
<Tab.Screen
  name="notifications"
  options={{
    title: 'Notifications',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="notifications" size={size} color={color} />
    ),
  }}
/>
```

### 3. Required Dependencies
Ensure these packages are installed:
```json
{
  "expo-notifications": "~0.x.x",
  "@react-native-async-storage/async-storage": "~1.x.x",
  "moment": "^2.x.x",
  "axios": "^1.x.x"
}
```

## Testing

### Test Follow-Up Notification API
```bash
# Get today's leads for an employee
GET https://api.chesadentalcare.com/notifications/leads/today/:empCode

# Send reminders to all employees
POST https://api.chesadentalcare.com/notifications/leads/send-reminders

# Get notification history
GET https://api.chesadentalcare.com/notifications/employee/:empId?limit=20
```

### Test Mobile App
1. Open the app in the morning
2. Check if Alert appears (if you have leads due)
3. Navigate to Notifications tab
4. Verify notifications are displayed
5. Tap a notification to test navigation
6. Pull to refresh
7. Tap "Clear All" to test clearing

## Future Enhancements

1. **Badge Count**: Show unread notification count on tab icon
2. **Push Notification Permissions**: Better handling of permission requests
3. **Rich Notifications**: Include lead details in notification
4. **Notification Actions**: Quick actions like "Call Customer" or "Reschedule"
5. **Sound/Vibration**: Custom notification sounds
6. **Analytics**: Track notification open rates
7. **Notification Preferences**: Let users configure notification times
8. **Overdue Leads**: Separate notifications for overdue follow-ups

## Troubleshooting

### Notifications Not Received
1. Check FCM token is registered: Query `fcm_tokens` table
2. Verify SAP session is active
3. Check notification_logs for errors
4. Ensure app has notification permissions

### API Errors
1. Check SAP B1SESSION is valid
2. Verify employee has SalesPersonCode set
3. Check MySQL connection
4. Review server logs

### Morning Check Not Working
1. Check `lastFollowUpCheck` value in AsyncStorage
2. Verify employee code is available in user data
3. Check network connection
4. Review console logs for errors

## Summary

This implementation provides a complete notification system for lead follow-ups:
- ✅ Backend APIs to fetch and send notifications from SAP data
- ✅ Push notifications via FCM
- ✅ Local notification storage
- ✅ Notification center UI
- ✅ Morning check for follow-ups
- ✅ Click handling to navigate to leads
- ✅ Notification logging for analytics

All notifications are non-intrusive and won't block the app if services are down.
