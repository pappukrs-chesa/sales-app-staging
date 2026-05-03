# Notification Tab Added to App

## Changes Made

### 1. Added Notification Tab to Navigation
**File:** `assets/constants/CustomTabBar.js`

Added a new tab between KPI and My Orders:

```javascript
const tabs = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'Home', label: 'Shop', icon: 'shopping-cart' },
  { name: 'EnterLeads', label: 'New Lead', icon: 'newspaper' },
  { name: 'kpi', label: 'KPI', icon: 'analytics' },
  { name: 'notifications', label: 'Alerts', icon: 'notifications' },  // ← NEW
  { name: 'two', label: 'My Orders', icon: 'format-list-numbered' },
  { name: 'more', label: 'Profile', icon: 'person' },
];
```

### 2. Added Unread Badge Counter
**File:** `assets/constants/CustomTabBar.js`

Features:
- Shows red badge with unread count on notifications icon
- Updates every 5 seconds automatically
- Shows "9+" if more than 9 unread notifications
- Only displays when there are unread notifications
- Badge has white border for visibility

```javascript
// State
const [unreadCount, setUnreadCount] = useState(0);

// Load unread count from AsyncStorage
const loadUnreadCount = async () => {
  const stored = await AsyncStorage.getItem('notifications');
  if (stored) {
    const notifications = JSON.parse(stored);
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }
};

// Badge display
{tab.name === 'notifications' && unreadCount > 0 && (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>
      {unreadCount > 9 ? '9+' : unreadCount}
    </Text>
  </View>
)}
```

### 3. Enhanced Notification Navigation
**File:** `app/(tabs)/notifications.js`

Updated `handleNotificationPress` to support different notification types:

```javascript
if (data.type === 'lead_followup' && data.leads) {
  router.push('/(tabs)');  // Navigate to Home (Leads page)
} else if (data.entityType === 'Lead' && data.entityId) {
  router.push({
    pathname: '/leads/[leadId]',
    params: { leadId: data.entityId }
  });
} else if (data.entityType === 'Order' && data.entityId) {
  router.push('/(tabs)/two');  // Navigate to My Orders
}
```

## Visual Design

### Tab Bar Layout (7 tabs)
```
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Home │ Shop │ Lead │ KPI  │ 🔔   │Orders│Profile│
│      │      │      │      │  3   │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
                              ↑
                         Badge shows
                         unread count
```

### Badge Styling
- **Position:** Top-right of bell icon
- **Color:** Red (#EF4444)
- **Border:** 2px white border
- **Text:** White, bold, 10px
- **Min Width:** 18px
- **Height:** 18px
- **Max Display:** "9+" for 10 or more notifications

## User Experience Flow

### Receiving a Notification
1. Push notification arrives
2. Stored in AsyncStorage with `read: false`
3. Badge counter updates automatically (within 5 seconds)
4. Bell icon shows red badge with count

### Reading Notifications
1. User taps "Alerts" tab
2. Sees list of all notifications (unread highlighted in blue)
3. Taps a notification
4. Notification marked as read
5. Navigates to relevant screen
6. Badge count decreases automatically

### Clearing Notifications
1. User taps "Clear All" button
2. All notifications deleted from AsyncStorage
3. Badge disappears
4. Empty state shown

## Auto-Update Mechanism

The badge count updates automatically via:
```javascript
useEffect(() => {
  loadUnreadCount();

  // Poll every 5 seconds
  const interval = setInterval(loadUnreadCount, 5000);

  return () => clearInterval(interval);
}, []);
```

This ensures:
- Badge updates when app is in foreground
- New notifications show up quickly
- Read status reflected immediately
- No manual refresh needed

## Technical Details

### State Management
- Notifications stored in: `AsyncStorage` key `'notifications'`
- Each notification has `read` boolean field
- Badge counts where `notification.read === false`

### Performance
- Polling every 5 seconds is lightweight
- Only reads from AsyncStorage (fast)
- No API calls for badge count
- Cleanup on component unmount

### Compatibility
- Works with all notification types:
  - Lead follow-ups
  - Order updates
  - General alerts
- Backward compatible with existing tabs
- No breaking changes to other features

## Testing Checklist

- [x] Notification tab appears in bottom navigation
- [x] Badge shows correct unread count
- [x] Badge updates when notification marked as read
- [x] Badge disappears when all notifications read
- [x] Badge shows "9+" for 10+ notifications
- [x] Tapping notification navigates correctly
- [x] Clear all removes badge
- [x] Badge updates automatically every 5 seconds
- [x] Tab icon highlights when active
- [x] Works with 7 tabs in bottom bar

## Before & After

### Before
- No notification center in app
- No way to view past notifications
- No visual indicator for new alerts

### After
- Dedicated "Alerts" tab in bottom navigation
- Red badge showing unread count
- Complete notification history
- Auto-updating badge counter
- Tap to navigate to relevant content
- Pull-to-refresh functionality
- Clear all option

## Notes

1. **Tab Label:** Changed from "Notifications" to "Alerts" for brevity (fits better in tab bar)
2. **Icon:** Uses Material Icons `notifications` (bell icon)
3. **Position:** Placed between KPI and My Orders for easy thumb access
4. **Auto-Refresh:** 5-second interval balances freshness and battery life
5. **Badge Limit:** Shows "9+" to prevent layout issues with large numbers
