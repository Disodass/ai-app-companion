# Admin Access Information

**Current Status:** November 2, 2025

---

## 🔓 **CURRENT ADMIN ACCESS**

Right now, **ANY authenticated user can access admin pages**.

### How It Works
- ProtectedRoute checks if user is logged in
- **No role/permission checking**
- If logged in → access granted
- If not logged in → redirected to sign in

### Admin Pages Protected
- `/admin/blog` - Blog admin panel
- `/admin/blog/edit/:postId` - Blog editor
- `/admin/email` - Email campaigns
- `/admin/email/templates` - Email templates
- `/admin/email/inbox` - Email inbox

---

## 👥 **WHO HAS ACCESS NOW**

After deleting the 11 accounts, these 5 users will have admin access:

1. **kirk.schilling@whiteoaksgroup.ca** (Kirk - primary)
2. **disopate@icloud.com** (Keep this one)
3. **courtneyghobbs@gmail.com** (Courtney)
4. **avandermey2023@gmail.com** (Ava)
5. **kschilling@whiteoaksgroup.ca** (Kirk - older account)

---

## ⚠️ **ISSUE: Too Many People Have Admin Access**

Currently, **every authenticated user** can:
- ❌ Access blog admin panel
- ❌ Edit/publish blog posts
- ❌ Send email campaigns to all subscribers
- ❌ View all emails in inbox
- ❌ Delete subscribers
- ❌ Access all Firestore data

**This is a security risk.**

---

## 🔒 **RECOMMENDED SOLUTION: Implement Role System**

### Option 1: Simple Whitelist (Easiest)
Add role checking to ProtectedRoute:

```javascript
// In ProtectedRoute.jsx
const ADMIN_EMAILS = [
  'kirk.schilling@whiteoaksgroup.ca',
  'disopate@icloud.com'
]

if (!user || !ADMIN_EMAILS.includes(user.email)) {
  return <Navigate to="/signin" />
}
```

### Option 2: Firestore Role Collection (Better)
Create an `admin_users` Firestore collection:

```javascript
// In Firestore
admin_users {
  userId: "yXuML6OiqwPvS8wygc6TXh0t4Cr2",
  email: "kirk.schilling@whiteoaksgroup.ca",
  role: "admin",
  addedAt: timestamp
}
```

### Option 3: Custom Claims (Most Secure)
Use Firebase Admin SDK to set custom claims:

```javascript
// In Cloud Function or admin panel
admin.auth().setCustomUserClaims(uid, { role: 'admin' })
```

---

## 📋 **ACTIONS NEEDED**

### Immediate
1. **Decide who should have admin access**
   - kirk.schilling@whiteoaksgroup.ca ✅ (primary admin)
   - disopate@icloud.com ❓ (should this be admin?)

2. **Revoke access from others**
   - courtneyghobbs@gmail.com
   - avandermey2023@gmail.com
   - kschilling@whiteoaksgroup.ca (duplicate account)

### Short Term
3. **Implement role checking**
   - Choose Option 1, 2, or 3 above
   - Update ProtectedRoute component
   - Deploy changes

### Long Term
4. **Add role management UI**
   - Admin panel to add/remove admins
   - Role assignment interface
   - Audit logs for admin actions

---

## 🎯 **RECOMMENDED ADMIN LIST**

Based on current setup, recommend only these admins:

**Primary Admin:**
- kirk.schilling@whiteoaksgroup.ca

**Optional Second Admin:**
- disopate@icloud.com (if you trust this account)

**Should NOT be admins:**
- courtneyghobbs@gmail.com
- avandermey2023@gmail.com
- kschilling@whiteoaksgroup.ca (duplicate/old account)

---

## 🔗 **Next Steps**

1. Decide admin list (probably just kirk.schilling@whiteoaksgroup.ca)
2. Implement role checking (Option 1 is fastest)
3. Test admin access works only for those users
4. Consider adding role management UI later

