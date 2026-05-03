# EmployeeCode Fix for Lead Follow-Up Notifications

## Issue
The notification system was incorrectly using employee `id` instead of `EmployeeCode` when querying SAP for leads.

## Understanding the Data Structure

### MySQL `sale_staff` Table
```
+------+------------------------+--------------+
| id   | username               | EmployeeCode |
+------+------------------------+--------------+
|   17 | Sudhir Pujar           | 6            |
|   12 | Sangeetha K            | 9            |
|   13 | Varadharaj T U         | 7            |
+------+------------------------+--------------+
```

### SAP `SalesOpportunities` Table
- `SalesPerson` field = **EmployeeCode** (NOT the MySQL id)
- Example: For Sudhir Pujar, SalesPerson = 6 (not 17)

## Key Mapping

```
MySQL sale_staff.EmployeeCode (6)
    ↓
SAP SalesOpportunities.SalesPerson (6)
    ↓
Same employee
```

## Changes Made

### 1. Backend API (`D:\chesa_api_gateway\src\apis\notifications\LeadFollowUpNotifications.js`)

#### getTodayFollowUpLeads Function
**Before:**
```javascript
const { empCode } = req.params; // Was ambiguous
const filter_param = `$filter=Status eq 'sos_Open' and SalesPerson eq ${empCode}...`;
```

**After:**
```javascript
const { empCode } = req.params; // Now documented as EmployeeCode from sale_staff
console.log('Fetching follow-up leads for EmployeeCode:', empCode, 'Date:', todayFormatted);

// empCode here is the EmployeeCode field from sale_staff table
// This corresponds to SalesPerson field in SAP
const filter_param = `$filter=Status eq 'sos_Open' and SalesPerson eq ${empCode}...`;
```

#### sendFollowUpReminders Function
**Before:**
```javascript
const employeesQuery = `
  SELECT id, SalesPersonCode, SalesEmpName
  FROM sales_employees
  WHERE SalesPersonCode IS NOT NULL
`;
```

**After:**
```javascript
const employeesQuery = `
  SELECT id, EmployeeCode, username as SalesEmpName
  FROM sale_staff
  WHERE EmployeeCode IS NOT NULL AND EmployeeCode != ''
`;

// Added validation
if (!employee.EmployeeCode || isNaN(employee.EmployeeCode)) {
  console.log(`Skipping ${employee.SalesEmpName} - invalid EmployeeCode`);
  continue;
}

// Use EmployeeCode for SAP query
const filter_param = `$filter=Status eq 'sos_Open' and SalesPerson eq ${employee.EmployeeCode}...`;
```

**Notification Data:**
```javascript
const data = {
  type: 'lead_followup',
  entityType: 'Lead',
  count: employee.LeadCount.toString(),
  date: todayFormatted,
  empId: employee.id.toString(),
  employeeCode: employee.EmployeeCode.toString(), // ← Changed from empCode/SalesPersonCode
  leads: JSON.stringify(employee.Leads)
};
```

### 2. Mobile App (`D:\sales-app\app\(tabs)\index.js`)

#### checkMorningFollowUps Function
**Before:**
```javascript
const user = JSON.parse(userData);
const empCode = user.SalesPersonCode || user.sales_person_code; // Wrong field

const response = await fetch(
  `https://api.chesadentalcare.com/notifications/leads/today/${empCode}`
);
```

**After:**
```javascript
const user = JSON.parse(userData);
// Use employeeCode from login response
// This maps to EmployeeCode in sale_staff table (e.g., 6 for Sudhir Pujar, NOT id 17)
const employeeCode = user.employeeCode;

if (!employeeCode) {
  console.log('No employeeCode found in user data');
  console.log('Available user fields:', Object.keys(user));
  return;
}

console.log(`Checking follow-ups for EmployeeCode: ${employeeCode}`);

const response = await fetch(
  `https://api.chesadentalcare.com/notifications/leads/today/${employeeCode}`
);
```

## Login API Response

The login API (`LoginSales.js`) already returns the correct `employeeCode`:

```javascript
user: {
  id: user.id || employee.employeeid,           // MySQL id (17 for Sudhir)
  role: user.role || employee.sub_role,
  subrole: employee.sub_role,
  sales_person: sales_person,
  employeeid: employee.employeeid,
  employeeCode: employee.EmployeeCode,          // ← This is what we need (6 for Sudhir)
  coordinator: employee.coordinator,
  target: employee.target,
}
```

## Data Flow

### Correct Flow (After Fix)
```
1. User logs in
   ↓
2. Login API returns user object with employeeCode: 6 (Sudhir's EmployeeCode)
   ↓
3. App stores user data in AsyncStorage
   ↓
4. Morning check retrieves user.employeeCode (6)
   ↓
5. API call: GET /notifications/leads/today/6
   ↓
6. Backend queries SAP: SalesPerson eq 6
   ↓
7. Returns Sudhir's leads
```

### Wrong Flow (Before Fix)
```
1. User logs in
   ↓
2. Login API returns user object with id: 17, employeeCode: 6
   ↓
3. App was using user.id (17) or wrong field
   ↓
4. API call: GET /notifications/leads/today/17
   ↓
5. Backend queries SAP: SalesPerson eq 17
   ↓
6. Returns no leads (SalesPerson 17 doesn't exist in SAP)
```

## Testing

### Test the API Directly
```bash
# For Sudhir Pujar (EmployeeCode = 6)
curl https://api.chesadentalcare.com/notifications/leads/today/6

# For Sangeetha K (EmployeeCode = 9)
curl https://api.chesadentalcare.com/notifications/leads/today/9

# Send reminders to all employees
curl -X POST https://api.chesadentalcare.com/notifications/leads/send-reminders
```

### Verify in SAP
```sql
-- Check which SalesPerson values exist in SAP
SELECT DISTINCT SalesPerson
FROM SalesOpportunities
WHERE Status = 'sos_Open'

-- Should match EmployeeCode values (6, 9, 7, etc.)
-- NOT the MySQL id values (17, 12, 13, etc.)
```

### Check in Mobile App
1. Login as a user
2. Check AsyncStorage for user object
3. Verify `user.employeeCode` exists and has correct value
4. Check console logs when app opens in morning
5. Should see: `Checking follow-ups for EmployeeCode: 6`

## Important Notes

1. **Use EmployeeCode, NOT id**
   - MySQL `sale_staff.id` = Internal database ID (17, 12, 13, etc.)
   - MySQL `sale_staff.EmployeeCode` = SAP SalesPerson Code (6, 9, 7, etc.)
   - SAP `SalesOpportunities.SalesPerson` = Matches EmployeeCode

2. **Field Names**
   - Login API returns: `user.employeeCode`
   - MySQL table column: `EmployeeCode`
   - SAP field: `SalesPerson`

3. **Validation**
   - Backend now skips employees with NULL or empty EmployeeCode
   - Backend logs warnings for invalid EmployeeCode values
   - Mobile app logs available user fields if employeeCode not found

4. **Backward Compatibility**
   - Only affects lead follow-up notifications
   - Does NOT change order/invoice/other functionality
   - Other parts of the app continue using appropriate IDs

## Verification Checklist

- [x] Backend uses `EmployeeCode` from `sale_staff` table
- [x] Backend queries SAP with correct `SalesPerson` value
- [x] Mobile app uses `user.employeeCode` from login response
- [x] Notification data includes `employeeCode` field
- [x] Logs show correct EmployeeCode values
- [x] Added validation for invalid/missing EmployeeCode
- [x] Documentation updated
