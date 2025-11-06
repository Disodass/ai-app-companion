# User Audit Summary - Bestibule
**Generated:** November 2, 2025

## Firebase Authentication Users (16 total)

### Active/Production Users
1. **admin@bestibule.ca** - Admin account (created: Nov 2024, last login: Nov 2024)
2. **kirk@bestibule.ca** - Primary admin (created: Nov 2024, last login: Nov 2024)
3. **kirk.schilling@whiteoaksgroup.ca** - Kirk (created: Nov 2025, last login: Nov 2025)
4. **amy@bestibule.ca** - Amy (created: Nov 2024, last login: Nov 2024)
5. **courtneyghobbs@gmail.com** - Courtney (created: Jan 2024, last login: Jan 2024)
6. **avandermey2023@gmail.com** - Ava (created: Apr 2024, last login: Apr 2024)
7. **kschilling@whiteoaksgroup.ca** - Kirk (created: Jun 2024, last login: Jun 2024)
8. **emmes@mac.com** - Emma (created: Jan 2024, last login: Nov 2024)

### Test Accounts (Should be deleted)
9. **disopate@hotmail.com** - Test account (created: Jun 2024, last login: Nov 2024)
   - **You tried to delete this but it still exists!**
10. **test@bestibule.com** - Test account (created: Nov 2024, last login: Nov 2024)
11. **testuser1758587851273@example.com** - Auto test (created: Nov 2024, last login: Nov 2024)

### Active User Accounts
12. **disopate@icloud.com** - Keep this account (created: Jan 2024, last login: Nov 2025)

### Development/Local Accounts (Should be deleted)
13. **kirk@local.bestibule** - Local dev (created: Nov 2024, last login: Nov 2024)
14. **kirk@secure.bestibule** - Secure dev (created: Nov 2024, last login: Nov 2024)
15. **amy@secure.bestibule** - Secure dev (created: Nov 2024, last login: Nov 2024)
16. **disopate@secure.bestibule** - Secure dev (created: Nov 2024, last login: Nov 2024)

---

## Issues Found

### 1. Deletion Problem
- **disopate@hotmail.com** was attempted to be deleted but still exists in Firebase Auth
- This is why you're getting "email-already-in-use" error

### 2. Test Account Accumulation
- 8 test/dev accounts exist that should be cleaned up
- Multiple Kirk test accounts with different domains

### 3. Potential Orphaned Data
- Need to check Firestore collections for data tied to these user IDs
- Collections to check: conversations, conversation_memory, email_preferences, user_profiles

---

## Recommended Actions

### Immediate Cleanup
Delete these test accounts from Firebase Auth:
- disopate@hotmail.com (qbosRmcG3mUxApx5szI1bvi2opT2)
- disopate@secure.bestibule (RhcxY36uXuTmWxKQUOLEqywe3S22)
- test@bestibule.com (QneSQsXakKYaSNILBXYWd2cLwSC2)
- testuser1758587851273@example.com (TBOxrvPrhaPs7Mg0iFkqkQRghig2)
- kirk@local.bestibule (7LyKYQrllWPpd4W0gSlY9gh0ZeO2)
- kirk@secure.bestibule (eNyc9uaPUSaoRFjzuNsjlJFayQI2)
- amy@secure.bestibule (Q1bp1JyXS4YcGBekj9LQoqnhOV13)

**KEEP:** disopate@icloud.com (E7UStXuqx1dZdJOpd9uT5utnQsy1)

### Optional Cleanup
- emmes@mac.com - low activity, possibly inactive user
- courtneyghobbs@gmail.com - no recent activity
- avandermey2023@gmail.com - no recent activity

---

## Next Steps

1. **Delete disopate@hotmail.com** - This is why you can't sign up again
2. **Check Firestore** for orphaned data tied to deleted users
3. **Clean up test accounts** in bulk
4. **Verify data integrity** after deletions

---

## Commands to Use

```bash
# Delete a specific user by email
firebase auth:export users.json --project ai-app-companion
firebase auth:import users.json --hash-algo scrypt --hash-key <key> --hash-rounds 8 --project ai-app-companion

# Or use Firebase Console:
# 1. Go to https://console.firebase.google.com/project/ai-app-companion/authentication/users
# 2. Select users to delete
# 3. Click "Delete user" button
```

---

## Notes

- All timestamps are in Unix milliseconds
- Users created between Jan 2024 - Nov 2025
- Most recent login: Nov 2025 (disopate@icloud.com)
- Multiple Kirk accounts suggest testing/debugging phase

