# Critical User Paths - Must Be Bulletproof

> **Context**: This app serves people self-representing in legal matters. Bugs don't just annoy users - they can cost someone their case, their home, or their job. These paths MUST work reliably.

## 🔴 P0 - Case-Losing Failures

### 1. Deadline Tracking

**Why Critical**: Missing a court deadline = automatic case dismissal

**Must Work**:

- [ ] User can create a deadline with date/time
- [ ] Deadline persists after app restart
- [ ] Deadline shows correct days remaining
- [ ] Deadline triggers notification BEFORE it expires
- [ ] Deadline dependencies work (B can't complete before A)
- [ ] Timezone handling is correct

**Test Coverage**:

- Integration test: Create deadline → restart app → verify still exists with correct date
- Integration test: Create deadline 1 day out → verify notification fires
- Unit test: Days remaining calculation across month/year boundaries
- Unit test: Timezone conversions

**Current Status**: ⚠️ UNKNOWN - tests timeout before verification

---

### 2. Notifications

**Why Critical**: Users need alerts for time-sensitive actions

**Must Work**:

- [ ] Notification service starts on app launch
- [ ] Deadline notifications fire at correct time
- [ ] Notifications persist if app is closed
- [ ] User can configure notification preferences
- [ ] PWA notifications work when installed
- [ ] Notification history is retained

**Test Coverage**:

- Integration test: Set deadline → verify notification triggers
- Integration test: Disable notifications → verify none fire
- Unit test: Notification scheduling logic
- Unit test: Notification deduplication

**Current Status**: ⚠️ UNKNOWN - tests timeout before verification

---

### 3. Data Persistence & Encryption

**Why Critical**: Users store sensitive legal documents

**Must Work**:

- [ ] Case data encrypts at rest
- [ ] Encrypted data survives app restart
- [ ] User can decrypt their own data
- [ ] Database corruption doesn't lose all data
- [ ] Backup/export functionality works
- [ ] Data deletion is permanent (privacy)

**Test Coverage**:

- Integration test: Store encrypted case → restart → decrypt successfully
- Integration test: Backup → restore → verify data integrity
- Unit test: Encryption key rotation
- Unit test: Data validation on load

**Current Status**: ⚠️ UNKNOWN - tests timeout before verification

---

## 🟡 P1 - Trust-Breaking Failures

### 4. Case Creation from Documents

**Why Critical**: Users don't know legal terminology - AI extraction helps

**Must Work**:

- [ ] PDF upload and text extraction
- [ ] OCR for scanned documents
- [ ] AI extracts dates, names, amounts accurately
- [ ] User can verify/correct AI extractions
- [ ] Failed extraction doesn't crash app
- [ ] Privacy: AI calls use user's own keys

**Test Coverage**:

- Integration test: Upload PDF → extract text → verify
- Integration test: Upload scanned image → OCR → extract data
- Unit test: Date parsing from various formats
- Unit test: Name/amount extraction accuracy

**Current Status**: ⚠️ UNKNOWN - no integration tests exist

---

### 5. AI Legal Information

**Why Critical**: Inaccurate legal info could lead users astray

**Must Work**:

- [ ] AI responses cite sources (gov.uk, legislation.gov.uk)
- [ ] Disclaimers visible: "Not legal advice"
- [ ] Multiple options presented, not single recommendation
- [ ] AI failures degrade gracefully
- [ ] Privacy: User's API key, conversations stay local

**Test Coverage**:

- Integration test: Ask question → verify source citations
- Integration test: Verify disclaimers present
- Unit test: Prompt construction includes disclaimers
- Unit test: Response validation for citation format

**Current Status**: ⚠️ UNKNOWN - likely no tests

---

## 🟢 P2 - Quality-of-Life Features

### 6. Search & Organization

- Tags work correctly
- Search finds relevant cases
- Filters apply correctly

### 7. Templates & Forms

- Templates load
- User can fill and export
- Formatting preserved

### 8. Audit Trail

- Actions logged
- Logs viewable
- Logs exportable

---

## Testing Strategy

### Current State: 🔥 BROKEN

- Tests timeout at 20 minutes
- 61 known test failures
- No integration test coverage
- Critical paths untested

### Fix Order:

1. **Fix test performance** (Claude working on this now)
2. **Fix unit test failures** (once tests run fast enough)
3. **Add integration tests for P0 paths** (this document guides what to test)
4. **Implement E2E tests for critical flows**

### Success Criteria:

- ✅ All P0 paths have integration test coverage
- ✅ Integration tests run in CI (<5 minutes)
- ✅ Critical path tests pass 100% of the time
- ✅ Any P0 regression caught before merge

---

## For Developers

**Before merging any PR:**

1. All critical path tests must pass
2. If you touch a P0 feature, add integration tests
3. Test on actual PWA installation, not just dev mode

**Adding New Features:**

1. Identify if it's P0/P1/P2
2. Add to this document
3. Write tests BEFORE implementing
4. Get real user feedback before considering "done"

---

## For Users (Open Source Contributors)

If you find a bug in a P0 critical path:

1. **Report immediately** - don't wait
2. Include: What you did, what happened, what you expected
3. If possible: Steps to reproduce
4. Label issue as `critical-path` and `bug`

Someone's case might depend on getting it fixed quickly.
