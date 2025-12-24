# Memory System + Encryption Implementation Plan

**Last Updated:** December 2024

## 🎯 Goals

1. **Cloud-Based Memory System** - All memory in Firestore, works across devices
2. **Master Encryption Key (MEK)** - Encrypt sensitive memory fields
3. **Firestore Cleanup** - Remove duplicates/legacy data

## 📋 Implementation Phases

### Phase 1: Memory System Structure (No Encryption)
- ✅ Auto-summarization every 50 messages
- ✅ Store in `conversations/{convId}/summaries`
- ✅ Maintain `conversation_memory/{convId}` for fast access
- ✅ Aggregate user memory in `users/{userId}/memory`
- ✅ All cloud-based (no localStorage dependency)

### Phase 2: Encryption Layer
- ⏳ Add MEK system
- ⏳ Encrypt sensitive memory fields
- ⏳ Support password reset without data loss
- ⏳ Backward compatible with plaintext

### Phase 3: Firestore Cleanup
- ⏳ Audit current state
- ⏳ Remove duplicates/legacy
- ⏳ Clean up empty/orphaned documents

## 🔒 Safety Strategy

- Feature branches → Test → Merge → Deploy → Verify
- Rollback plan ready for each phase
- Backward compatible (don't break existing users)
- Test locally before deploying

## 📁 File Structure

```
src/services/
├── memoryService.js              # NEW: Memory management
├── masterEncryptionService.js    # NEW: MEK system (Phase 2)
├── conversationService.js         # UPDATE: Auto-summarization trigger
├── conversationSummaryService.js  # UPDATE: Encryption wrapper (Phase 2)
└── serverMessaging.js            # UPDATE: Use memory in prompts

scripts/
├── audit-firestore.js            # NEW: Audit current state
└── cleanup-firestore.js          # NEW: Safe cleanup (Phase 3)
```

## ✅ Testing Checklist

### Phase 1 Testing
- [ ] Site loads
- [ ] User can log in
- [ ] User can send messages
- [ ] AI responds correctly
- [ ] Send 50+ messages → summary created
- [ ] Memory loads on chat open
- [ ] Memory syncs across devices
- [ ] No console errors

### Rollback Commands
```bash
# Git revert
git revert <commit-hash>
git push origin main

# Firebase rollback
firebase hosting:rollback
```

## 📝 Notes

- All memory must be cloud-based (Firestore)
- Backward compatible with existing data
- No UI changes (invisible to user)
- Keep Firebase Auth email+password login

