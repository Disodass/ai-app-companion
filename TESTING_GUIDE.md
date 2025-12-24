# Phase 1 Testing Guide

## Quick Start Testing

### Step 1: Start Local Development Server

```bash
npm run dev
```

This will start the app at `http://localhost:5173` (or similar port)

### Step 2: Open Browser Console

Open your browser's developer console (F12 or Cmd+Option+I) to see logs.

### Step 3: Test Basic Functionality

1. **Sign in** to your account
2. **Open chat** with AI Friend (or any supporter)
3. **Send a few messages** to verify basic chat works
4. **Check console** - you should see logs like:
   - `📚 Loaded user memory:`
   - `📚 Loaded conversation memory:`
   - `📊 Conversation has X messages, no summary needed yet`

### Step 4: Test Auto-Summarization (Main Test)

**Goal:** Send 50+ messages to trigger auto-summarization

**Option A: Manual Testing (Recommended)**
1. Send 50+ messages in one conversation
   - You can send quick messages like "test 1", "test 2", etc.
   - Or have a real conversation
2. **Watch console** for:
   - `📊 Auto-summarizing conversation...`
   - `✅ Auto-summarization complete`
   - `✅ Updated conversation_memory`
   - `✅ Updated user memory`

**Option B: Quick Test Script**
If you want to test faster, you can temporarily modify the threshold:
- In `src/services/memoryService.js`, change line ~140:
  - From: `return currentMessageCount >= 50;`
  - To: `return currentMessageCount >= 5;` (for testing)
- Then send 5+ messages to trigger summarization
- **Remember to change it back before deploying!**

### Step 5: Verify Memory in Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/project/ai-app-companion/firestore)
2. Check these collections:

**A. Check Summaries:**
- Navigate to: `conversations` → `{your-conversation-id}` → `summaries`
- Should see new summary document with:
  - `keyThemes` (array)
  - `importantFacts` (array)
  - `userPreferences` (array)
  - `summaryText` (string)

**B. Check Conversation Memory:**
- Navigate to: `conversation_memory` collection
- Find document with your conversation ID
- Should see:
  - `keyFacts` (array)
  - `preferences` (array)
  - `keyThemes` (array)
  - `lastSummaryAt` (timestamp)

**C. Check User Memory:**
- Navigate to: `users` → `{your-user-id}`
- Check `memory` field:
  - `globalFacts` (array)
  - `preferences` (array)
  - `conversationSummaries` (object with conversation IDs)

### Step 6: Test Memory Loading

1. **Refresh the page** (Cmd+R or F5)
2. **Open chat** again
3. **Check console** - should see:
   - `📚 Loaded user memory:` (with your data)
   - `📚 Loaded conversation memory:` (with your data)
4. **Send a message** - AI should have context from memory

### Step 7: Test Cross-Device Sync (Optional)

1. Open the app on a different device/browser
2. Sign in with the same account
3. Open the same conversation
4. Memory should load automatically
5. AI responses should have context from previous conversations

## What to Look For

### ✅ Success Indicators

- Console shows memory loading logs
- Summaries are created after 50+ messages
- Firestore has new documents in:
  - `conversations/{convId}/summaries`
  - `conversation_memory/{convId}`
  - `users/{userId}/memory`
- No errors in console
- Chat still works normally
- AI responses seem more contextual (may be subtle)

### ❌ Error Indicators

- Console shows errors (red text)
- Summaries not being created
- Memory not loading
- Chat broken or messages not sending
- Firestore permission errors

## Common Issues & Fixes

### Issue: "No summaries created after 50+ messages"

**Check:**
1. Console logs - is summarization being triggered?
2. Firestore rules - do you have permission?
3. Network tab - any failed requests?

**Fix:**
- Check console for errors
- Verify Firestore rules are deployed
- Make sure you're authenticated

### Issue: "Memory not loading"

**Check:**
1. Console logs - are memory functions being called?
2. Firestore - do the documents exist?
3. Network tab - any failed requests?

**Fix:**
- Check console for errors
- Verify documents exist in Firestore
- Check Firestore rules

### Issue: "Build errors"

**Fix:**
```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## Testing Checklist

- [ ] Local dev server starts without errors
- [ ] Can sign in
- [ ] Can send messages
- [ ] AI responds correctly
- [ ] Console shows memory loading logs
- [ ] Send 50+ messages → summary created
- [ ] Firestore has summary document
- [ ] Firestore has conversation_memory document
- [ ] Firestore has user memory updated
- [ ] Refresh page → memory loads
- [ ] No console errors
- [ ] Performance is acceptable

## Next Steps After Testing

If all tests pass:
1. ✅ Commit changes
2. ✅ Create feature branch
3. ✅ Deploy to production
4. ✅ Test in production
5. ✅ Monitor for issues

If tests fail:
1. ❌ Check console errors
2. ❌ Check Firestore rules
3. ❌ Verify authentication
4. ❌ Fix issues and retest

