# Service Calls State-Based Filtering - Mobile App Integration

## Changes Made

### File Updated: `app/(tabs)/service.js`

## Summary of Changes

### 1. Updated Employee Data Loading
**Before:**
```javascript
const storedEmpId = await AsyncStorage.getItem('employeeID');
const determinedCrmId = storedEmpId === '640' ? 2 : 1;
```

**After:**
```javascript
const userData = await AsyncStorage.getItem('user');
const user = JSON.parse(userData);
const employeeCode = user.employeeCode || await AsyncStorage.getItem('sales_person');
```

**Why:** Now uses `employeeCode` from user data (maps to `sale_staff.EmployeeCode` in database)

### 2. Replaced API Endpoint
**Before:**
```javascript
// Old coordinator-only API
axios.get(`${API_BASE_URL}/get_service_calls?id=${crmId}`)
axios.get(`${API_BASE_URL}/waiting_call_processed`)
```

**After:**
```javascript
// New state-based API (single call)
axios.get(`${API_BASE_URL}/get_service_calls_by_state?employeeCode=${empId}`)
```

**Why:** 
- Single API call instead of two
- Automatically filters by employee state
- Includes all call types (clinical, installation, out of warranty, radiology)
- Merges waiting_calls data on backend

### 3. Simplified Data Mapping
**Before:**
```javascript
// Manual merging of SAP and waiting_calls data
const appMap = new Map(appData.map(a => [String(a.serviceCallId), a]));
const merged = sapData.map(sap => {
  const m = appMap.get(String(sap.ServiceCallID));
  // Complex merging logic...
});
```

**After:**
```javascript
// Direct mapping (backend already merged data)
const merged = sapData.map(sap => ({
  ServiceID: sap.ServiceCallID,
  Subject: sap.Subject,
  Name: sap.CustomerName,
  // Simple field mapping...
}));
```

**Why:** Backend handles data merging, cleaner mobile code

### 4. Removed Unused State
- Removed `crmId` state variable
- Removed CRM ID logic
- Simplified dependencies

## How It Works Now

### For Sales Staff (e.g., Sudhir Pujar, State: MH)
1. App loads `employeeCode` from AsyncStorage
2. Calls `/get_service_calls_by_state?employeeCode=6`
3. Backend filters calls where state = 'MH'
4. App displays only Maharashtra calls

### For Coordinators (e.g., Krutika Lilaramani)
1. App loads `employeeCode` from AsyncStorage
2. Calls `/get_service_calls_by_state?employeeCode=10`
3. Backend uses `state_map` table to get coordinator's states
4. App displays calls from all mapped states

## Testing Checklist

- [ ] Sales staff see only calls from their state
- [ ] Coordinators see calls from their mapped states
- [ ] All call types are visible (clinical, installation, out of warranty, radiology)
- [ ] Pull-to-refresh works correctly
- [ ] Engineer allocation still works
- [ ] No console errors
- [ ] Loading states work properly

## Expected Behavior

### Sales Staff in Maharashtra (MH)
```
Employee: Sudhir Pujar (Code: 6)
State: MH
Expected Calls: Only calls with ShipToState = 'MH'
```

### Sales Staff in Karnataka (KT)
```
Employee: Sangeetha K (Code: 9)
State: KT
Expected Calls: Only calls with ShipToState = 'KT'
```

### Coordinator
```
Employee: Krutika Lilaramani (Code: 10)
Role: coordinator
Expected Calls: All calls from states in state_map table
```

## Troubleshooting

### Issue: No calls showing
**Check:**
1. Is `employeeCode` stored in AsyncStorage?
2. Does employee have a state in `sale_staff` table?
3. Are there any calls with matching state?

**Debug:**
```javascript
console.log('Employee Code:', empId);
console.log('API Response:', response.data);
console.log('Filtered Calls:', merged.length);
```

### Issue: Wrong calls showing
**Check:**
1. Employee's state in database
2. Service call's `ShipToState` field
3. Backend filtering logic

### Issue: API error
**Check:**
1. Network connection
2. API endpoint is correct: `/get_service_calls_by_state`
3. Employee code is valid

## Benefits

✅ **Simplified Code:** Single API call instead of two
✅ **Better Performance:** Backend handles filtering and merging
✅ **State-Based Access:** Sales staff see only their state's calls
✅ **All Call Types:** Clinical, installation, out of warranty, radiology
✅ **Backward Compatible:** Coordinators still work as before
✅ **Cleaner Logic:** No manual data merging in mobile app

## Next Steps

1. Test with different employee roles
2. Verify state filtering works correctly
3. Check engineer allocation functionality
4. Monitor API performance
5. Gather user feedback
