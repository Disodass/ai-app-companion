# Groq API Key Server-Side Setup

## ✅ What We've Done

1. **Created Cloud Function** (`functions/index.js`):
   - Added `aiReply` function that calls Groq API server-side
   - Uses Firebase Secrets to store the API key securely
   - Requires authentication (user must be signed in)

2. **Created Client Service** (`src/services/aiReplyService.js`):
   - Helper function to call the Cloud Function
   - Replaces all direct Groq API calls

3. **Updated All Client Code**:
   - `src/services/serverMessaging.js` - Updated to use Cloud Function
   - `src/providers/groq.js` - Updated to use Cloud Function
   - `src/components/Chat.jsx` - Updated both Groq calls to use Cloud Function
   - Removed all `VITE_GROQ_API_KEY` references from client code

## 🔧 Next Steps

### 1. Set the Groq API Key Secret in Firebase

Run this command to set the secret (replace `YOUR_GROQ_API_KEY` with your actual key):

```bash
firebase functions:secrets:set GROQ_API_KEY
```

When prompted, paste your Groq API key.

**OR** if you prefer to set it directly:

```bash
echo "YOUR_GROQ_API_KEY" | firebase functions:secrets:set GROQ_API_KEY
```

### 2. Deploy the Updated Cloud Function

```bash
cd new-project
firebase deploy --only functions:aiReply
```

### 3. Rotate the Exposed API Key (IMPORTANT!)

**Since the API key was exposed in git history, you MUST:**

1. Go to [Groq Dashboard](https://console.groq.com/)
2. Create a **new API key**
3. Use the new key in step 1 above
4. **Revoke/delete the old exposed key** (check git history for the old key if needed)

### 4. Test the Setup

1. Hard refresh your browser (Cmd+Shift+R)
2. Sign out and sign back in
3. Send a message in chat
4. Check that AI responses work

## 🔒 Security Notes

- ✅ API key is now **never** sent to the client
- ✅ API key is stored securely in Firebase Secrets
- ✅ All Groq API calls go through authenticated Cloud Function
- ✅ No `VITE_GROQ_API_KEY` in client bundle anymore

## 📝 Files Changed

- `functions/index.js` - Added `aiReply` Cloud Function
- `src/services/aiReplyService.js` - New client service
- `src/services/serverMessaging.js` - Updated to use Cloud Function
- `src/providers/groq.js` - Updated to use Cloud Function
- `src/components/Chat.jsx` - Updated both Groq calls

## 🐛 Troubleshooting

If AI responses don't work:

1. Check Cloud Function logs:
   ```bash
   firebase functions:log --only aiReply
   ```

2. Verify the secret is set:
   ```bash
   firebase functions:secrets:access GROQ_API_KEY
   ```

3. Check browser console for errors

4. Verify user is authenticated (must be signed in to use AI)

