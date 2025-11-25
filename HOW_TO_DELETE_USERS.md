# How to Delete Users in Firebase Console

## 📝 Step-by-Step Instructions

### 1. Navigate to Firebase Console
Go to: https://console.firebase.google.com/project/ai-app-companion/authentication/users

### 2. Find the User
- Use the search bar at the top to search for each email address
- OR scroll through the list to find the user

### 3. Delete Single User

#### Method A: Individual Delete
1. Click on the user's email address (opens user details)
2. Scroll to the bottom of the user details panel
3. Click the **"Delete user"** button
4. Confirm the deletion in the popup dialog
5. Done!

#### Method B: Bulk Delete
1. Check the checkbox next to each user you want to delete
2. Selected users will show at the top
3. Click the trash icon / "Delete" button at the top
4. Confirm the deletion
5. Done!

---

## 🎯 **QUICK REFERENCE: Users to Delete**

Copy-paste these into the search box one at a time:

```
disopate@hotmail.com
kirk@bestibule.ca
amy@bestibule.ca
emmes@mac.com
test@bestibule.com
testuser1758587851273@example.com
kirk@local.bestibule
kirk@secure.bestibule
amy@secure.bestibule
disopate@secure.bestibule
```

---

## ⚠️ **IMPORTANT**

**DO NOT DELETE:**
- admin@bestibule.ca
- kirk.schilling@whiteoaksgroup.ca
- disopate@icloud.com ⭐
- courtneyghobbs@gmail.com
- avandermey2023@gmail.com
- kschilling@whiteoaksgroup.ca

---

## 📸 Visual Guide

### Finding Users
1. Firebase Console → Authentication → Users tab
2. You'll see a list of all users
3. Search box is at the top right

### Deleting Process
1. **Click on user email** → User details panel opens
2. Scroll down to bottom
3. **Click "Delete user"** button (red text, bottom left)
4. **Confirm** in the popup

### Bulk Delete (Multiple at Once)
1. **Check boxes** next to usernames
2. Selected count appears at top
3. **Click trash icon** at top
4. **Confirm** deletion

---

## 🔍 Pro Tips

- Use Ctrl+F (Cmd+F on Mac) to search the page for specific emails
- You can select multiple users at once to delete them all together
- There's no "undo" - be careful!
- After deletion, the user data in Firestore may still exist (separate cleanup needed if desired)

---

## ✅ After Deleting

Once you delete **disopate@hotmail.com**, you'll be able to:
- Sign up again with that email address
- Stop getting the "email-already-in-use" error

Test this by trying to sign up at: https://bestibule.ca/signup

