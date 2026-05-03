# Lead Flow Documentation

This document explains how leads work in this project, which screens and tabs are involved, where lead data comes from, how leads are updated, whether dealers are part of lead generation, and how authentication actually behaves around the lead flow.

## Project Context

This app is an Expo + React Native mobile app using `expo-router` for routing. Lead functionality is spread across:

- `Leads` tab: `app/(tabs)/index.js`
- `Enter Leads` tab: `app/(tabs)/EnterLeads.js`
- Lead detail screen: `app/leads/[leadId].js`
- Lead route layout: `app/leads/_layout.js`
- Lead expansion UI: `components/leads/SalesOppLines.js`
- Older duplicate lead detail component: `components/leads/ViewPage.js`

The bottom tab bar maps `index` to the `Leads` tab in:

- `assets/constants/CustomTabBar.js`

## Lead-Related Tabs And Screens

### 1. Leads Tab

File:

- `app/(tabs)/index.js`

Purpose:

- Main open leads listing screen
- Search, filter, sort, and refresh leads
- Expand a lead to see sales opportunity lines
- Open full lead details
- Update follow-ups
- Trigger follow-up reminder logic

### 2. Enter Leads Tab

File:

- `app/(tabs)/EnterLeads.js`

Purpose:

- Create a new lead or enquiry
- Assign a salesperson/owner based on state and city
- Choose source, products, expected value, closing date, etc.

### 3. Lead Detail Screen

File:

- `app/leads/[leadId].js`

Purpose:

- Fetch complete sales opportunity data for one lead
- Show product interests
- Show follow-up lines
- Update follow-up
- Mark lead as lost
- Mark lead as won
- Update interest level
- Fetch order info when converting/winning

### 4. Lead Layout

File:

- `app/leads/_layout.js`

Purpose:

- Simple stack layout for the lead detail route
- Does not enforce authentication

### 5. Sales Opportunity Lines Component

File:

- `components/leads/SalesOppLines.js`

Purpose:

- Used inside the leads list to show expanded line-level follow-up data
- Shows stage, dates, status, remarks
- Provides buttons for `View Details` and `Follow Up`

### 6. Older Duplicate Detail Component

File:

- `components/leads/ViewPage.js`

Notes:

- This overlaps heavily with `app/leads/[leadId].js`
- It appears to be an older or duplicated implementation of the lead detail flow

## Main Lead Flow

The lead flow in this project works like this:

1. User logs in.
2. User opens the `Leads` tab.
3. App loads cached lead data from `AsyncStorage` if available.
4. App fetches fresh open leads from backend.
5. User can search, sort, filter, and expand lead rows.
6. Expanded rows show sales opportunity line details.
7. User can open the full lead detail screen.
8. On the detail screen, the app fetches full sales opportunity data and product mappings.
9. User can:
   - add/update follow-up
   - mark lost
   - mark won
   - change interest level
10. User can also create a new lead from the `Enter Leads` tab.
11. Checkout also uses open leads so orders can be linked to leads.

## Exact Lead Routes

### Tab Route

- `/(tabs)` -> `app/(tabs)/index.js`

This is the `Leads` tab.

### Lead Detail Route

- `/leads/[leadId]` -> `app/leads/[leadId].js`

The leads list routes to this screen using:

- `router.push({ pathname: "/leads/[leadId]", params: { ... } })`

This route is triggered from:

- `app/(tabs)/index.js`

### Enter Leads Tab Route

- `/(tabs)/EnterLeads`

Mapped by file:

- `app/(tabs)/EnterLeads.js`

## Exact Lead APIs Used

Below are the lead-related endpoints used directly by the frontend.

### APIs used by the Leads tab

File:

- `app/(tabs)/index.js`

Endpoints:

- `GET https://api.chesadentalcare.com/open_leads`
  - Main source for the open leads list
- `GET https://api.chesadentalcare.com/all_sales_employees_info`
  - Used for coordinator/team-related lead filtering
- `GET https://api.chesadentalcare.com/sales_emp_names`
  - Used to fetch employee metadata
- `GET https://api.chesadentalcare.com/getStageKey`
  - Used to resolve stage key labels
- `GET https://api.chesadentalcare.com/notifications/leads/today/{employeeCode}`
  - Used for daily follow-up reminder logic
- `PATCH https://api.chesadentalcare.com/patch_LeadDueDate`
  - Used to update lead due date
- `PATCH https://api.chesadentalcare.com/patch_followup`
  - Used to update follow-up line data

### APIs used by Enter Leads

File:

- `app/(tabs)/EnterLeads.js`

Endpoints:

- `GET https://api.chesadentalcare.com/state_employee_info`
  - Used to auto-map state/city to salesperson and CRM owner
- `GET https://api.chesadentalcare.com/crmpro`
  - Used to load products for lead interest selection
- `POST https://api.chesadentalcare.com/new_lead_entry_test`
  - Used to submit a new lead

### APIs used by Lead Detail

File:

- `app/leads/[leadId].js`

Endpoints:

- `GET https://api.chesadentalcare.com/getStageKey`
  - Used if stage keys are not already cached
- `GET https://api.chesadentalcare.com/sales_opportunity/{leadId}`
  - Main detail data source for one lead
- `GET https://api.chesadentalcare.com/crmpro`
  - Used to map interest product IDs to product names
- `PATCH https://api.chesadentalcare.com/patch_followup`
  - Update follow-up data
- `PATCH https://api.chesadentalcare.com/patchloss`
  - Mark lead as lost
- `PATCH https://api.chesadentalcare.com/patchwon`
  - Mark lead as won
- `PATCH https://api.chesadentalcare.com/patch_interest_level`
  - Update lead interest level
- `GET https://api.chesadentalcare.com/DocEntry?id={salesOrderNumber}`
  - Used in the won flow to fetch order/customer/dealer data

### Leads also used from Checkout

File:

- `app/Checkout/index.js`

Endpoint:

- `GET https://api.chesadentalcare.com/open_leads`

This indicates the order flow can reference existing leads.

## Exact Answer: Is There A GET Route For Leads?

Yes.

The main GET route for leads is:

- `GET https://api.chesadentalcare.com/open_leads`

This is the primary route used to fetch the open lead list in:

- `app/(tabs)/index.js`
- `app/Checkout/index.js`

There is also a lead detail GET route:

- `GET https://api.chesadentalcare.com/sales_opportunity/{leadId}`

That is used in:

- `app/leads/[leadId].js`

## Where Leads Are Getting Loaded From

The app gets leads from the backend API at `api.chesadentalcare.com`.

Main sources:

- `open_leads` for the list of open leads
- `sales_opportunity/{leadId}` for full lead detail
- `notifications/leads/today/{employeeCode}` for due follow-up notifications

The frontend also caches lead-related data in `AsyncStorage`, but the real source is the backend API.

## Lead Caching

The leads screen uses local storage caching.

Files:

- `app/(tabs)/index.js`

Important cache keys seen there:

- `cachedLeadsData`
- `EmpDetails`
- `stageKeys`
- `leadsWithDetails`

This means the flow is:

- try cached data first
- fetch fresh backend data
- update local cache

The lead detail and follow-up flows also remove or refresh some cached entries when updates happen.

## Lead Creation Flow

Lead creation happens in:

- `app/(tabs)/EnterLeads.js`

The form collects:

- customer name
- email
- phone number
- category
- state
- state code
- city
- pincode
- address
- selected products
- interest level
- source
- expected closing date
- expected value
- person in charge
- remarks
- enquiry vs lead type

The screen validates required fields, then constructs a payload and posts it to:

- `POST https://api.chesadentalcare.com/new_lead_entry_test`

The payload includes fields such as:

- `employeeId`
- `state`
- `stateCode`
- `city`
- `interest`
- `source`
- `expdate`
- `price`

The screen also assigns ownership automatically by calling:

- `GET https://api.chesadentalcare.com/state_employee_info`

That mapping sets:

- salesperson code
- CRM owner ID

based on state/city.

## Enquiry vs Lead

The create screen supports two types:

- `Enquiry`
- `Lead`

In `EnterLeads.js`:

- choosing `Enquiry` sets interest level to `5`
- choosing `Lead` requires a real interest level

So the app treats enquiries and leads as related but distinct flows inside the same screen.

## Sources Available For Lead Creation

Defined in:

- `app/(tabs)/EnterLeads.js`

Exact source options in code:

- `1` -> `Phone`
- `2` -> `Direct`
- `3` -> `Social Media`
- `4` -> `Employee Lead`
- `5` -> `Organic Lead`
- `6` -> `House Of Alt`
- `7` -> `Service Team Lead`
- `8` -> `CRM Lead`
- `9` -> `Expo`
- `10` -> `May 24 Forecast`
- `12` -> `Dealer Lead`

## Is Dealer Involved In Lead Generation?

### Short answer

Dealer is only visibly involved as a `source` type, not as a standard lead creation field.

### What is actually present

In `EnterLeads.js`, the create-lead form includes:

- source = `Dealer Lead`

But the create screen does not show:

- dealer selector
- dealer code picker
- dealer ID field
- dealer lookup call

So frontend-wise:

- a lead can be marked as coming from a dealer by selecting source `Dealer Lead`
- but the normal create flow does not actively attach a dealer entity during submission

### Where dealer does show up

In:

- `app/leads/[leadId].js`

the won/conversion flow fetches order data using:

- `GET https://api.chesadentalcare.com/DocEntry?id={salesOrderNumber}`

and then stores/displays:

- `Customer`
- `Dealer`

That means dealer appears during lead conversion/order linkage, not clearly during initial lead generation.

### Important distinction

The app's order/shop flow is heavily dealer-driven, especially in:

- `app/(tabs)/Home/Purchase.js`

But that is a separate commerce flow, not the core lead creation flow.

## Lead Detail Flow

The detail route:

- `/leads/[leadId]`

loads full lead data using:

- `GET sales_opportunity/{leadId}`

Then it:

- loads stage keys
- loads product catalog from `crmpro`
- maps `SalesOpportunitiesInterests` to product names
- initializes current follow-up date/action/remarks

The detail screen supports these operations:

### 1. Update Follow-Up

Endpoint:

- `PATCH https://api.chesadentalcare.com/patch_followup`

### 2. Mark Loss

Endpoint:

- `PATCH https://api.chesadentalcare.com/patchloss`

### 3. Mark Won

Endpoint:

- `PATCH https://api.chesadentalcare.com/patchwon`

### 4. Update Interest Level

Endpoint:

- `PATCH https://api.chesadentalcare.com/patch_interest_level`

### 5. Fetch Sales Order / Dealer / Customer

Endpoint:

- `GET https://api.chesadentalcare.com/DocEntry?id={salesOrderNumber}`

This is used during the won flow.

## Leads Tab Expanded Rows

The expanded row UI is in:

- `components/leads/SalesOppLines.js`

It renders:

- line number
- amount
- start date
- follow-up date
- stage
- status
- remarks

It also exposes two main actions:

- `View Details`
- `Follow Up`

Permission-like behavior in this component is very light. It computes disabled logic for some actions based on:

- role
- stored employee code
- lead salesperson code

But this is UI logic, not real route or API security.

## Morning Follow-Up Reminder Flow

In:

- `app/(tabs)/index.js`

the app runs a daily check using:

- `GET https://api.chesadentalcare.com/notifications/leads/today/{employeeCode}`

If results are found:

- it shows a local alert
- it stores a local notification object in `AsyncStorage`

This is notification support around leads, not the lead list itself.

## How Lead Ownership Is Assigned

Lead ownership on creation is not chosen manually from a dealer flow.

Instead, `EnterLeads.js` fetches:

- `GET https://api.chesadentalcare.com/state_employee_info`

and matches by:

- state
- city

Then it sets:

- `selectedSalesEmpCode`
- `newDataOwnerId`

So assignment is geography-driven in the frontend.

## Lead-Related Points System

Lead operations are tied into the points system.

Examples:

- new lead entry in `EnterLeads.js` calls `addPointsToTable`
- follow-up updates in lead detail also call `addPointsToTable`
- loss/won actions may also award points

This uses:

- `ContextAPI/PointsContext.js`

So leads are not only CRM objects here; they are also part of employee incentive tracking.

## Authentication: What Is Actually Protected?

### Login exists

Authentication starts in:

- `app/auth/index.js`
- `ContextAPI/AuthContext.js`

Login endpoint:

- `POST https://api.chesadentalcare.com/login_sales_test`

On successful login, the app stores values such as:

- `user`
- `token`
- `id`
- `sales_person`
- `role`

in `AsyncStorage`.

### Startup redirect exists

In:

- `app/_layout.js`

the app checks stored login/session data and redirects to:

- `/welcome`
- `/auth`
- `/(tabs)/Home`

### But route protection is weak

There is no strong global route guard for all screens.

Lead-specific routes do not enforce auth themselves:

- `app/leads/_layout.js` is only a simple stack
- `app/leads/[leadId].js` does not block unauthenticated access on its own

Many screens only assume login state exists in `AsyncStorage`.

### API authentication is also weak on the frontend

From the frontend code reviewed:

- the app stores a login token
- but lead API requests generally do not send `Authorization: Bearer ...`
- most lead API calls are plain `fetch(...)` or `axios(...)` without auth headers

That means frontend-side auth is mostly:

- login gate
- stored session data
- startup redirect behavior

It is not a robust per-request client auth system.

### Exact answer on auth

The app is not enforcing strong authentication for every route after login.

More precisely:

- authentication is used for login and session persistence
- but after login, many routes are effectively just client-side accessible if navigation reaches them
- lead requests themselves do not appear to include bearer token auth
- if real authorization exists, it would need to be enforced by the backend, not by the client code shown here

## Important Authentication Inconsistency

There is also a session inconsistency:

- `app/_layout.js` checks an `expiry` value when deciding whether to auto-enter the app
- `ContextAPI/AuthContext.js` says the token never expires and no longer sets expiry

So the app has mixed logic around session validation.

That is another sign that authentication behavior is not fully consistent.

## Exact Files To Read For Lead Flow

If you want to understand the entire lead flow in code, read these in order:

1. `app/(tabs)/index.js`
2. `components/leads/SalesOppLines.js`
3. `app/leads/[leadId].js`
4. `app/(tabs)/EnterLeads.js`
5. `ContextAPI/AuthContext.js`
6. `app/_layout.js`
7. `app/Checkout/index.js`

## Final Summary

### Core lead screens

- `app/(tabs)/index.js`
- `app/(tabs)/EnterLeads.js`
- `app/leads/[leadId].js`

### Main lead list source

- `GET https://api.chesadentalcare.com/open_leads`

### Main lead detail source

- `GET https://api.chesadentalcare.com/sales_opportunity/{leadId}`

### Lead create route

- `POST https://api.chesadentalcare.com/new_lead_entry_test`

### Dealer involvement

- dealer exists as source type `Dealer Lead`
- dealer is not obviously a normal input in lead creation
- dealer appears more clearly during lead-to-order conversion

### Authentication behavior

- login exists
- session is stored locally
- route protection is weak
- lead API calls do not obviously send bearer tokens
- frontend auth mostly acts like a login gate rather than strict authorization across all routes

