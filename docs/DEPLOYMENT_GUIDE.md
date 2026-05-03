# Deployment Guide - Push Notifications Update v6.3.0

## ⚠️ IMPORTANT: This Update Requires a New Build

**You CANNOT use OTA (Over-The-Air) update for this release.**

This update includes native dependencies and configuration changes that require rebuilding the app binary.

---

## Why New Build is Required?

### Changes That Require Native Rebuild:

1. **Native Packages Installed:**
   - `expo-notifications` (native notification handling)
   - `firebase` (Firebase SDK)
   - `expo-device` (device information)
   - `@react-native-firebase/app` (Firebase core)
   - `@react-native-firebase/messaging` (FCM messaging)

2. **Configuration Changes:**
   - `app.json` - Added expo-notifications plugin
   - `google-services.json` - Added Firebase Android config
   - Build properties updated for Firebase integration

3. **New Native Features:**
   - Push notification permissions
   - Firebase Cloud Messaging integration
   - Notification channels (Android)
   - Background notification handling

---

## Pre-Deployment Checklist

### Backend (Must Complete First)

- [ ] Database migration executed
  ```bash
  mysql -u chesa -p sales < D:/chesa_api_gateway/docs/database/fcm_tokens_table.sql
  ```

- [ ] Backend server updated with new code
  - [ ] TokenManagement.js deployed
  - [ ] PushNotificationService.js deployed
  - [ ] Routes.js updated

- [ ] Backend server restarted
  ```bash
  cd D:\chesa_api_gateway
  npm start
  ```

- [ ] Test backend endpoints
  ```bash
  curl http://localhost:4000/notifications/tokens
  ```

### Mobile App

- [ ] Version bumped to 6.3.0 ✅ (Already done)
- [ ] All dependencies installed ✅ (Already done)
- [ ] google-services.json in place ✅ (Already done)
- [ ] NotificationProvider added to app ✅ (Already done)

---

## Deployment Steps

### Step 1: Build the App

#### For Android (Production)

```bash
cd D:\sales-app

# Build production APK/AAB
eas build --profile production --platform android
```

**Build Configuration:**
- Build Type: APK (for direct installation) or AAB (for Play Store)
- Version: 6.3.0
- Includes: All native dependencies and Firebase config

**Build Time:** Approximately 15-20 minutes

#### For iOS (If applicable)

```bash
# Build for iOS
eas build --profile production --platform ios
```

**Note:** Requires Apple Developer account and iOS certificates

---

### Step 2: Download the Build

Once the build completes:

1. **Via EAS CLI:**
   ```bash
   eas build:list
   # Copy the build URL and download
   ```

2. **Via Expo Dashboard:**
   - Visit: https://expo.dev/accounts/[your-account]/projects/sales-app/builds
   - Download the latest build (v6.3.0)

---

### Step 3: Testing Before Rollout

#### Internal Testing

1. **Install on Test Device:**
   ```bash
   # For Android
   adb install path/to/your-app-v6.3.0.apk
   ```

2. **Test Login:**
   - Login with a test employee account
   - Verify token is registered in database:
     ```sql
     SELECT * FROM fcm_tokens WHERE emp_id = 'TEST_EMP_ID';
     ```

3. **Send Test Notification:**
   ```bash
   curl -X POST http://localhost:4000/notifications/send-to-employees \
     -H "Content-Type: application/json" \
     -d '{
       "empIds": ["TEST_EMP_ID"],
       "title": "Test Notification",
       "body": "Testing v6.3.0 push notifications",
       "notificationType": "general"
     }'
   ```

4. **Verify Notification Received:**
   - Check notification appears on device
   - Tap notification and verify app opens correctly
   - Check app handles notification data properly

---

### Step 4: Rollout Strategy

#### Option A: Phased Rollout (Recommended)

**Phase 1: Internal Team (Week 1)**
- Deploy to 5-10 internal users
- Monitor for issues
- Gather feedback

**Phase 2: Beta Group (Week 2)**
- Deploy to 20-30 active sales people
- Monitor notification delivery rates
- Check database for token registration success

**Phase 3: Full Rollout (Week 3)**
- Deploy to all users
- Monitor system performance
- Keep old version available for rollback

#### Option B: Direct Rollout

If you're confident:
- Deploy to all users at once
- Have rollback plan ready
- Monitor closely for first 24 hours

---

### Step 5: Distribution Methods

#### Method 1: Direct APK Distribution

1. **Upload APK to shared location:**
   - Company server
   - Google Drive
   - Firebase App Distribution

2. **Send notification to users:**
   ```
   Subject: Important App Update Required

   Dear Team,

   A new version (6.3.0) of Chesa Sales App is available with push notifications feature.

   Download and install from: [LINK]

   New Features:
   - Real-time push notifications for orders
   - Lead status updates
   - Special offers and announcements

   Note: You must uninstall the old version first, then install the new one.

   Thanks,
   IT Team
   ```

3. **Installation Instructions for Users:**
   ```
   1. Uninstall old version (Settings > Apps > Chesa Sales App > Uninstall)
   2. Download new APK from the link
   3. Enable "Install from Unknown Sources" if prompted
   4. Install the APK
   5. Login with your credentials
   6. Allow notification permissions when prompted
   ```

#### Method 2: Google Play Store (If available)

1. Upload AAB to Play Console
2. Submit for review
3. Create staged rollout
4. Monitor crash reports and reviews

---

### Step 6: User Communication

#### Before Rollout

**Announcement Email:**
```
Subject: New App Update Coming - Push Notifications!

Dear Sales Team,

We're excited to announce a major update to the Chesa Sales App!

What's New in Version 6.3.0:
✅ Real-time push notifications for order updates
✅ Instant alerts for new leads
✅ Special offers and promotions
✅ Important company announcements

What You Need to Do:
1. Update the app when you receive the notification
2. Allow notifications when prompted (Very Important!)
3. Login with your existing credentials

Release Date: [DATE]

For any issues, contact IT support.

Best regards,
IT Team
```

#### During Rollout

**Installation Guide (Share via WhatsApp/Email):**
```
📱 Chesa Sales App v6.3.0 Installation Guide

Step 1: Download
[Download Link]

Step 2: Uninstall Old Version
Go to Settings > Apps > Chesa Sales App > Uninstall

Step 3: Install New Version
- Open downloaded APK
- Click "Install"
- If blocked, enable "Unknown Sources" in settings

Step 4: Setup Notifications
- Login with your credentials
- When prompted, ALLOW notifications (Important!)
- You're all set!

Need help? Contact: [Support Number]
```

---

### Step 7: Monitoring After Deployment

#### Day 1: Critical Monitoring

1. **Check Token Registration Rate:**
   ```sql
   -- Total users with registered tokens
   SELECT COUNT(DISTINCT emp_id) as users_with_tokens
   FROM fcm_tokens
   WHERE is_active = TRUE
   AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY);
   ```

2. **Monitor Notification Delivery:**
   ```sql
   -- Notification success rate
   SELECT
     SUM(success_count) as total_success,
     SUM(failure_count) as total_failure,
     ROUND(SUM(success_count) * 100.0 /
       (SUM(success_count) + SUM(failure_count)), 2) as success_rate
   FROM notification_logs
   WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY);
   ```

3. **Check for Errors:**
   - Review backend logs
   - Check Firebase Console for issues
   - Monitor user feedback

#### Week 1: Regular Monitoring

- **Daily:** Check notification delivery rates
- **Daily:** Review user feedback
- **Weekly:** Analyze notification engagement
- **Weekly:** Check database growth

---

### Step 8: Rollback Plan (If Needed)

If critical issues occur:

1. **Stop New Installations:**
   - Remove download links
   - Notify users to wait

2. **Keep Old Version Available:**
   - Provide link to v6.2.1
   - Users can reinstall if needed

3. **Fix Issues:**
   - Identify root cause
   - Fix in codebase
   - Build new version (6.3.1)

4. **Communicate:**
   - Inform users of the issue
   - Provide timeline for fix
   - Offer support

---

## Post-Deployment Tasks

### Week 1

- [ ] Send welcome notification to all users
  ```bash
  curl -X POST http://localhost:4000/notifications/broadcast \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Welcome to New Chesa Sales App!",
      "body": "You will now receive real-time updates on orders, leads, and offers!",
      "notificationType": "announcement"
    }'
  ```

- [ ] Create notification automation triggers
- [ ] Document common issues and solutions
- [ ] Train support team on new features

### Week 2-4

- [ ] Gather user feedback
- [ ] Analyze notification engagement metrics
- [ ] Optimize notification content based on data
- [ ] Plan next features based on usage patterns

---

## Integration with Existing Systems

### Trigger Notifications from Order Processing

Add this to your order status update code:

```javascript
// In D:\chesa_api_gateway\src\apis\Sales\PatchOrderReceipt.js
// Or wherever you update order status

import axios from 'axios';

// After updating order status
await axios.post('http://localhost:4000/notifications/order-status', {
  orderId: order.id,
  orderNumber: order.orderNumber,
  status: newStatus,
  empIds: [order.assignedEmpId],
  additionalData: {
    customerName: order.customerName,
    updatedBy: 'System'
  }
}).catch(err => console.error('Notification failed:', err));
```

### Trigger Notifications from Lead Management

```javascript
// When lead status changes
await axios.post('http://localhost:4000/notifications/lead-status', {
  leadId: lead.id,
  leadSequenceNo: lead.sequenceNo,
  status: newStatus,
  empIds: [lead.assignedEmpId],
  additionalData: {
    customerName: lead.customerName
  }
}).catch(err => console.error('Notification failed:', err));
```

---

## Troubleshooting Common Issues

### Issue: Users Not Receiving Notifications

**Possible Causes:**
1. Notifications not enabled in device settings
2. FCM token not registered
3. App not updated to v6.3.0

**Solution:**
1. Guide user to enable notifications:
   - Android: Settings > Apps > Chesa Sales App > Notifications > Enable
2. Ask user to logout and login again
3. Verify token in database

---

### Issue: Notifications Delayed

**Possible Causes:**
1. Device in battery saver mode
2. App in background restrictions
3. Network issues

**Solution:**
1. Disable battery optimization for the app
2. Allow background data
3. Check internet connection

---

### Issue: Token Registration Failing

**Check:**
```sql
-- Check failed registration attempts in app logs
-- Verify database connectivity
-- Check Firebase configuration
```

**Solution:**
- Restart backend server
- Verify Firebase credentials in .env
- Check database table exists

---

## Success Metrics

Track these KPIs:

1. **Adoption Rate:**
   - Target: 90% of users on v6.3.0 within 2 weeks

2. **Token Registration Rate:**
   - Target: 95% of active users with registered tokens

3. **Notification Delivery Rate:**
   - Target: >98% successful delivery

4. **User Engagement:**
   - Track notification open rates
   - Monitor app usage after notifications

---

## Support Contacts

**Technical Issues:**
- Backend/API: [Backend Team Contact]
- Mobile App: [Mobile Team Contact]
- Database: [Database Team Contact]

**User Support:**
- Help Desk: [Support Number]
- Email: [Support Email]

---

## Version History

| Version | Date | Changes | Type |
|---------|------|---------|------|
| 6.3.0 | 2025-01-17 | Added Firebase push notifications | Major |
| 6.2.1 | Previous | Last stable version | - |

---

## Next Steps After Deployment

1. **Monitor Performance:**
   - Daily checks for first week
   - Weekly reviews thereafter

2. **User Feedback:**
   - Collect feedback via surveys
   - Track support tickets
   - Analyze usage patterns

3. **Future Enhancements:**
   - Notification preferences
   - Scheduled notifications
   - Rich notifications with images
   - Notification history in app

---

## Conclusion

This deployment brings a major enhancement to the sales app. Follow this guide carefully to ensure a smooth rollout.

**Remember:**
- ✅ Complete backend deployment first
- ✅ Test thoroughly before rollout
- ✅ Have rollback plan ready
- ✅ Communicate clearly with users
- ✅ Monitor closely post-deployment

Good luck with the deployment! 🚀
