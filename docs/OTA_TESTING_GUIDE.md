# 🧪 Testing OTA Updates - Important Information

## ⚠️ Why You're Seeing the Error

```
ERROR  📱 Error checking for updates: [Error: checkForUpdateAsync() is not
supported in Expo Go. A non-development build should be used to test this functionality.]
```

**This is EXPECTED!** OTA updates **do NOT work in Expo Go or development builds.**

---

## 🎯 How OTA Updates Work

### **Where OTA Works:**
✅ **Production builds** (APK built with `eas build`)
✅ **Preview builds** (APK built with `eas build --profile preview`)

### **Where OTA DOESN'T Work:**
❌ **Expo Go** (the purple app)
❌ **Development builds** (`npx expo start`)
❌ **`npx expo run:android`**

---

## 🚀 How to Test OTA Updates (Step-by-Step)

### **Step 1: Build a Preview APK**

```bash
eas build --platform android --profile preview
```

This will:
- Build an APK with OTA updates enabled
- Take about 10-15 minutes
- Give you a download link

### **Step 2: Install the APK**

1. Download the APK from the link EAS provides
2. Transfer to your Android device
3. Install it (you may need to enable "Install from unknown sources")

### **Step 3: Make a Code Change**

For example, change a text in `app/(tabs)/index.js`:

```javascript
// Find a text like:
<Text style={styles.headerTitle}>Open Leads</Text>

// Change it to:
<Text style={styles.headerTitle}>Open Leads (Updated!)</Text>
```

### **Step 4: Publish the Update**

```bash
eas update --branch preview --message "Test update - changed title"
```

### **Step 5: Test on Device**

1. **Close the app completely** (swipe away from recent apps)
2. **Open the app again**
3. You should see: **"🎉 Update Available"**
4. Click **"Restart Now"**
5. After 2-3 seconds, you should see the changed text!

---

## 📱 Full Testing Workflow

```bash
# 1. Build preview APK (do this ONCE)
eas build --platform android --profile preview

# 2. Install APK on device

# 3. Make a code change
# ... edit files ...

# 4. Push update
eas update --branch preview --message "Testing OTA"

# 5. Close and reopen app on device
# 6. See update alert!
# 7. Click "Restart Now"
# 8. Verify change is visible
```

---

## 🔍 Checking Update Status

### **View your updates:**
```bash
eas update:list --branch preview
```

### **View build status:**
```bash
eas build:list --platform android
```

---

## ⚡ Quick Test Checklist

- [ ] Built preview APK: `eas build -p android --profile preview`
- [ ] Installed APK on Android device
- [ ] Made a visible code change (text/color)
- [ ] Pushed update: `eas update --branch preview --message "Test"`
- [ ] Closed app completely on device
- [ ] Reopened app on device
- [ ] Saw update alert
- [ ] Clicked "Restart Now"
- [ ] Verified change is visible

---

## 🎭 Production vs Preview

### **Preview (for testing):**
```bash
# Build
eas build --platform android --profile preview

# Update
eas update --branch preview --message "Testing feature"
```

### **Production (for users):**
```bash
# Build
eas build --platform android --profile production

# Update
eas update --branch production --message "Bug fix"
```

**They work the same way, just different channels!**

---

## 💡 Understanding the Error

The error you saw means:
- ✅ OTA update checking code is working
- ✅ Configuration is correct
- ❌ But you're in Expo Go (which doesn't support OTA)

**Solution:** Build and install an actual APK as shown above.

---

## 🐛 Troubleshooting

### **Issue: Build fails**

**Error:** `eas.json is not valid`

**Fix:** The eas.json file was already fixed. Try again:
```bash
eas build --platform android --profile preview
```

---

### **Issue: Update not showing on device**

**Check:**
1. Did you close and reopen the app?
2. Is the device connected to internet?
3. Did you wait a few seconds after opening?

**Try:**
```bash
# Check update was published
eas update:list --branch preview

# Try publishing again
eas update --branch preview --message "Re-test"
```

---

### **Issue: "Updates are not enabled in this build"**

**Cause:** You're testing in development mode or Expo Go

**Fix:** Build and install an APK:
```bash
eas build --platform android --profile preview
```

---

## 📊 Development vs Production Testing

### **In Development (Expo Go):**
```javascript
// UpdateChecker will show:
console.log('📱 Updates are not enabled in this build');

// This is NORMAL and EXPECTED
// OTA updates don't work in development
```

### **In Production/Preview Build:**
```javascript
// UpdateChecker will show:
console.log('📱 Checking for updates...');
console.log('✅ Update available! Downloading...');
console.log('✅ Update downloaded successfully!');

// User sees alert with "Restart Now" button
```

---

## 🎯 Recommended Testing Flow

### **First Time (Complete Testing):**

```bash
# 1. Build preview APK
eas build --platform android --profile preview
# Wait 10-15 minutes, get download link

# 2. Install on device

# 3. Verify app works

# 4. Make a small change (change a text)

# 5. Push update
eas update --branch preview --message "First test update"

# 6. Test on device (close, reopen, see alert)

# 7. Make another change

# 8. Push another update
eas update --branch preview --message "Second test update"

# 9. Test again

# 10. Once satisfied, build production
eas build --platform android --profile production
```

---

## 🚀 Going to Production

Once testing is complete:

### **Step 1: Build Production APK**
```bash
eas build --platform android --profile production
```

### **Step 2: Distribute to Team**
- Download APK
- Send to sales team
- Have them install

### **Step 3: Start Using OTA Updates**
```bash
# From now on, just:
eas update --branch production --message "Your update description"
```

---

## 📝 Example Test Session

```bash
# Terminal output you should see:

$ eas build --platform android --profile preview
✔ Build finished. Download URL: https://expo.dev/...

$ eas update --branch preview --message "Testing colors"
✔ Update published successfully!
  Branch: preview
  Runtime version: 6.2.1
  Update ID: abc123-def456

# On device, you should see:
# 1. Open app
# 2. Alert: "🎉 Update Available"
# 3. Click "Restart Now"
# 4. App restarts in 2-3 seconds
# 5. Changes are visible!
```

---

## ✅ Success Indicators

You'll know OTA is working when:

1. **Build succeeds:** APK downloads successfully
2. **Install works:** App opens normally on device
3. **Update publishes:** No errors from `eas update` command
4. **Alert appears:** User sees "Update Available" message
5. **Changes apply:** After restart, code changes are visible

---

## 🎉 Next Steps

1. **Build preview APK** now:
   ```bash
   eas build --platform android --profile preview
   ```

2. **Wait for build** (check status with `eas build:list`)

3. **Download and install** APK on device

4. **Test update flow** as described above

5. **Once working, build production** APK for your team

---

## 💬 Common Questions

**Q: Why can't I test in Expo Go?**
**A:** Expo Go is a generic app for development. OTA updates need a specific build of YOUR app.

**Q: How long does building take?**
**A:** 10-15 minutes for first build. You only do this once per profile.

**Q: Do I need to rebuild for every update?**
**A:** NO! That's the beauty of OTA. Build once, update forever with `eas update`.

**Q: Is there a faster way to test?**
**A:** No, you need a real build to test OTA. But it's worth it - you only build once!

---

**Remember:** The error you saw is normal for development mode. Build an APK to test OTA updates properly!

**Start here:**
```bash
eas build --platform android --profile preview
```
