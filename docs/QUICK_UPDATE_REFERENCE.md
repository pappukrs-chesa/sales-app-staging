# ⚡ Quick OTA Update Reference

## 🚀 Push an Update (Most Common)

```bash
eas update --branch production --message "Description of changes"
```

---

## 📦 First Time Setup

```bash
# 1. Login to EAS
eas login

# 2. Build production APK (do this once)
eas build --platform android --profile production

# 3. Download and distribute APK to team
```

---

## 🔄 Regular Workflow

```bash
# 1. Make your code changes
# ... edit files ...

# 2. Push update
eas update --branch production --message "Fixed date picker bug"

# 3. Users get update automatically when they open app!
```

---

## 📝 Common Update Examples

```bash
# Bug fix
eas update --branch production --message "Fixed login issue"

# New feature
eas update --branch production --message "Added sales report"

# Multiple changes
eas update --branch production --message "Fixed bugs and improved performance"
```

---

## 🔍 View Updates

```bash
# List all updates
eas update:list --branch production

# View specific update
eas update:view [update-id]
```

---

## ⏮️ Rollback (If Something Breaks)

```bash
eas update:rollback --branch production
```

---

## 🧪 Test Before Production

```bash
# 1. Push to preview
eas update --branch preview --message "Testing new feature"

# 2. Test on preview build
# ... test thoroughly ...

# 3. Push to production
eas update --branch production --message "Tested feature ready"
```

---

## ⚠️ When You Need a New APK

Build new APK when you:
- Add new native libraries
- Change app permissions
- Upgrade Expo SDK
- Change app name/icon

```bash
eas build --platform android --profile production
```

---

## 📊 Update Status

```bash
# Check current production version
eas channel:view production

# View build details
eas build:list --platform android
```

---

## 🛠️ Troubleshooting

**Users not getting updates?**
```bash
# Re-publish
eas update --branch production --message "Re-deploy"
```

**App crashes after update?**
```bash
# Rollback immediately
eas update:rollback --branch production
```

**Check logs**
- Look for: "📱 Checking for updates..." in app console
- Visit: https://expo.dev (EAS dashboard)

---

## 💡 Tips

✅ **Always use descriptive messages**
✅ **Test in preview first**
✅ **Keep version number updated in app.json**
✅ **Push updates during off-hours**
✅ **Monitor after deployment**

---

## 🎯 What Can/Cannot Be Updated

### ✅ CAN Update via OTA:
- JavaScript code
- UI changes
- Bug fixes
- New features
- Images/assets

### ❌ CANNOT Update via OTA:
- Native modules
- Permissions
- SDK version
- App name/icon

---

**Need more help?** See `OTA_UPDATE_GUIDE.md` for detailed documentation.
