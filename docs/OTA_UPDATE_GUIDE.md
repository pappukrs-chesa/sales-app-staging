# 📱 OTA (Over-The-Air) Update Guide - Chesa Sales App

## ✅ What Has Been Set Up

Your app now has **automatic OTA updates** configured! Users will receive updates automatically without needing to install a new APK every time.

---

## 🎯 How It Works

1. **User opens the app** → UpdateChecker component runs
2. **Checks for updates** → Contacts Expo servers
3. **If update available** → Downloads in background
4. **Shows alert** → "Update available, restart to apply?"
5. **User clicks "Restart Now"** → App reloads with new version
6. **Or clicks "Later"** → Update applied next time app restarts

---

## 📦 What Was Configured

### 1. **Files Modified:**
- ✅ `app.json` - Added runtime version and update URL
- ✅ `eas.json` - Added update channels (development, preview, production)
- ✅ `app/_layout.js` - Integrated UpdateChecker component
- ✅ `package.json` - Added expo-updates dependency

### 2. **Files Created:**
- ✅ `components/UpdateChecker.js` - Automatic update checking component

---

## 🚀 How to Push Updates (Step-by-Step)

### **First Time Setup (One-time only):**

1. **Login to EAS:**
   ```bash
   eas login
   ```
   Use your Expo account credentials.

2. **Build a production APK with updates enabled:**
   ```bash
   eas build --platform android --profile production
   ```
   This creates an APK with OTA update support. Download and distribute this APK to your sales team.

---

### **Regular Update Workflow (Every time you make changes):**

#### **Step 1: Make Your Changes**
Edit your code (fix bugs, add features, etc.)

#### **Step 2: Test Locally**
```bash
npx expo start
```
Make sure everything works.

#### **Step 3: Publish Update to Production**
```bash
eas update --branch production --message "Description of changes"
```

**Examples:**
```bash
# Bug fix
eas update --branch production --message "Fixed date picker issue"

# New feature
eas update --branch production --message "Added sales forecasting"

# Multiple fixes
eas update --branch production --message "Fixed login bug and improved performance"
```

#### **Step 4: Users Get Update**
- Users open the app
- They see: "🎉 Update Available"
- They click "Restart Now"
- New version loads!

---

## 📝 Update Examples

### **Example 1: Fix a Bug**
```bash
# You fixed a bug in the login screen
eas update --branch production --message "Fixed login button not responding"
```

### **Example 2: Add a Feature**
```bash
# You added a new report
eas update --branch production --message "Added monthly sales report"
```

### **Example 3: UI Changes**
```bash
# You changed button colors
eas update --branch production --message "Updated button colors to match brand"
```

---

## 🔍 Check Update Status

### **View Published Updates:**
```bash
eas update:list --branch production
```

### **View Specific Update Details:**
```bash
eas update:view [update-id]
```

### **Check Which Users Have Which Version:**
```bash
eas channel:view production
```

---

## 🎭 Testing Updates Before Production

### **Step 1: Publish to Preview Channel**
```bash
eas update --branch preview --message "Testing new feature"
```

### **Step 2: Install Preview Build on Test Device**
```bash
eas build --platform android --profile preview
```

### **Step 3: Test Thoroughly**

### **Step 4: Push to Production**
```bash
eas update --branch production --message "New feature tested and ready"
```

---

## ⚠️ Important Limitations

### **What CAN be updated via OTA:**
✅ JavaScript code (React Native components)
✅ UI changes (buttons, colors, layouts)
✅ Business logic (calculations, API calls)
✅ Bug fixes
✅ New features (pure JavaScript)
✅ Images and assets

### **What CANNOT be updated via OTA:**
❌ New native modules/libraries
❌ App permissions changes
❌ Expo SDK version upgrades
❌ App name or icon changes
❌ Build configuration changes

**For these changes, you need to build and distribute a new APK.**

---

## 🔧 Troubleshooting

### **Issue: Users not getting updates**

**Check 1: Is update published?**
```bash
eas update:list --branch production
```

**Check 2: Are users on correct build?**
- Users must have the APK built with `eas build` (not `npx expo run:android`)

**Check 3: Check app logs**
- Look for console logs: "📱 Checking for updates..."

**Fix:**
```bash
# Re-publish update
eas update --branch production --message "Re-deploy update"
```

---

### **Issue: Update check fails**

**Cause:** Network issues or wrong configuration

**Fix:**
1. Check `app.json` has correct `projectId`
2. Verify `updates.url` is correct
3. Check internet connection

---

### **Issue: App crashes after update**

**Immediate Fix:**
```bash
# Rollback to previous version
eas update:rollback --branch production
```

**Long-term Fix:**
1. Test updates in preview channel first
2. Use staged rollouts for large changes

---

## 📊 Update Best Practices

### **1. Always Test First**
```bash
# Test in preview
eas update --branch preview --message "Testing fix"

# After testing, push to production
eas update --branch production --message "Tested fix deployed"
```

### **2. Use Descriptive Messages**
```bash
# ❌ Bad
eas update --branch production --message "update"

# ✅ Good
eas update --branch production --message "Fixed login validation and improved loading speed"
```

### **3. Check Before Pushing**
```bash
# View what's currently in production
eas update:list --branch production
```

### **4. Monitor After Deployment**
- Check logs for errors
- Ask users to confirm they got the update
- Have a rollback plan ready

---

## 🔄 Rollback Updates

### **If Something Goes Wrong:**

**Step 1: View Recent Updates**
```bash
eas update:list --branch production
```

**Step 2: Rollback**
```bash
eas update:rollback --branch production
```

This reverts to the previous working version.

---

## 📱 User Experience

### **What Users See:**

1. **Open app** → Normal loading
2. **Update detected** → Alert appears:
   ```
   🎉 Update Available

   A new version of the app has been
   downloaded. Please restart to apply
   the changes.

   [Later]  [Restart Now]
   ```
3. **Click "Restart Now"** → App reloads (2-3 seconds)
4. **New version running!** → Users continue working

### **Update is Silent if:**
- Update downloads in background
- User continues using app
- Next time they restart naturally, update applies

---

## 💡 Pro Tips

### **1. Schedule Updates During Off-Hours**
```bash
# Push updates when sales team is not active
eas update --branch production --message "Scheduled maintenance update"
```

### **2. Gradual Rollouts**
```bash
# Start with preview channel
eas update --branch preview --message "Testing with small group"

# After validation, push to production
eas update --branch production --message "Validated feature rollout"
```

### **3. Keep Version Numbers Updated**
Update `version` in `app.json` for major releases:
```json
{
  "expo": {
    "version": "6.2.2"  // Increment this
  }
}
```

---

## 📞 Quick Reference

### **Most Common Commands:**

```bash
# Login
eas login

# Build production APK (once)
eas build --platform android --profile production

# Push update (every time you change code)
eas update --branch production --message "Your message here"

# View updates
eas update:list --branch production

# Rollback
eas update:rollback --branch production
```

---

## 🎉 Success!

Your app now has automatic OTA updates!

**Next Steps:**
1. Build production APK: `eas build --platform android --profile production`
2. Distribute APK to your sales team
3. Make a code change
4. Push update: `eas update --branch production --message "Test update"`
5. Open app and see the update prompt!

---

## 📧 Support

If you encounter issues:
1. Check Expo docs: https://docs.expo.dev/eas-update/introduction/
2. Check EAS dashboard: https://expo.dev/accounts/[your-account]/projects/sales-app
3. View update logs in the Expo dashboard

---

**Last Updated:** 2025-11-11
**App Version:** 6.2.1
**OTA Status:** ✅ Enabled
