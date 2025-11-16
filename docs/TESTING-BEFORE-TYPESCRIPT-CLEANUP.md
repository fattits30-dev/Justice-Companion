# Testing Checklist - Before TypeScript Cleanup

**Purpose:** Verify all features work via HTTP before deleting TypeScript services

**Backend Status:** ✅ Running at http://127.0.0.1:8000
**Frontend Status:** Ready to test via HTTP
**Date:** 2025-01-15

---

## Quick Start Testing

### 1. Access API Documentation
Open in browser to verify backend is running:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

Expected: All pages load successfully

---

### 2. Manual Feature Testing (Priority Order)

#### **CRITICAL - Authentication Flow** 🔴
**Must work for all other features**

1. **Register New Account**
   - Navigate to registration page
   - Fill in: username, email, password
   - Submit form
   - Expected: Success message, redirect to login

2. **Login**
   - Enter credentials from registration
   - Submit login form
   - Expected: Dashboard loads, session token stored

3. **Logout**
   - Click logout button
   - Expected: Redirect to login, session cleared

4. **Invalid Login**
   - Try incorrect password
   - Expected: Error message "Invalid credentials"

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

#### **HIGH PRIORITY - Core Features** 🟠

**Case Management**

1. **Create Case**
   - Navigate to Cases
   - Click "New Case"
   - Fill in: title, type, description
   - Save
   - Expected: Case appears in list

2. **View Case List**
   - Navigate to Cases
   - Expected: All cases display

3. **Edit Case**
   - Click on a case
   - Edit title or description
   - Save
   - Expected: Changes persist

4. **Delete Case**
   - Select a case
   - Click delete
   - Confirm
   - Expected: Case removed from list

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

**AI Chat with Streaming**

1. **Send Message**
   - Navigate to Chat
   - Type message: "What is employment law?"
   - Send
   - Expected: Response streams token-by-token

2. **Upload Document**
   - Click upload button
   - Select PDF file
   - Expected: File uploads, appears in chat

3. **Create Case from Chat**
   - Click "Create Case" during conversation
   - Expected: Case created with context

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

**Dashboard**

1. **View Dashboard Stats**
   - Navigate to Dashboard
   - Expected: Stats load (total cases, active cases, evidence)

2. **Recent Cases Widget**
   - Verify recent cases display
   - Expected: Last 5 cases shown

3. **Upcoming Deadlines Widget**
   - Verify deadlines display
   - Expected: Next 5 deadlines shown

4. **Quick Actions**
   - Click "New Case" button
   - Expected: Navigates to case creation form

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

#### **MEDIUM PRIORITY - Feature Components** 🟡

**Search**

1. **Global Search**
   - Enter search query in header
   - Expected: Results from cases, evidence, conversations

2. **Advanced Search**
   - Use filters (entity type, date range)
   - Expected: Filtered results

3. **Saved Searches**
   - Save a search
   - Load saved search
   - Expected: Search executes with saved params

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

**Notifications**

1. **View Notifications**
   - Click notification bell icon
   - Expected: Notification list opens

2. **Mark as Read**
   - Click on unread notification
   - Expected: Badge count decreases

3. **Notification Preferences**
   - Navigate to Settings → Notifications
   - Toggle notification types
   - Save
   - Expected: Preferences persist

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

**Tags**

1. **Create Tag**
   - Navigate to Tags
   - Click "New Tag"
   - Enter name, select color
   - Save
   - Expected: Tag appears in list

2. **Assign Tag to Case**
   - Open a case
   - Click "Add Tag"
   - Select tag
   - Expected: Tag badge appears on case

3. **Search by Tag**
   - Click on a tag
   - Expected: All cases with that tag display

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

**Templates**

1. **View Template Library**
   - Navigate to Templates
   - Expected: 8 system templates + user templates

2. **Apply Template**
   - Select "Employment Dispute" template
   - Fill in variables
   - Create case from template
   - Expected: Case created with pre-filled data

3. **Create Custom Template**
   - Click "New Template"
   - Enter name, content with variables
   - Save
   - Expected: Template available in library

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

**Profile & Settings**

1. **View Profile**
   - Navigate to Profile
   - Expected: User info displays

2. **Edit Profile**
   - Update first name, last name
   - Save
   - Expected: Changes persist

3. **Change Password**
   - Click "Change Password"
   - Enter current + new password
   - Submit
   - Expected: Password updated, must re-login

4. **AI Provider Configuration**
   - Navigate to Settings → AI Provider
   - Select OpenAI
   - Enter API key
   - Test connection
   - Expected: Connection successful

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

#### **LOW PRIORITY - Advanced Features** 🟢

**GDPR/Export**

1. **Export User Data**
   - Navigate to Settings → Privacy
   - Click "Export Data"
   - Select JSON format
   - Expected: File downloads with all data

2. **Delete Account** (⚠️ USE TEST ACCOUNT)
   - Click "Delete Account"
   - Check "Export before delete"
   - Confirm deletion
   - Expected: Account deleted, cannot login

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

**Deadlines**

1. **Create Deadline**
   - Navigate to Deadlines
   - Click "New Deadline"
   - Enter: title, date, priority
   - Save
   - Expected: Deadline appears in calendar/list

2. **Mark Complete**
   - Click checkbox on deadline
   - Expected: Status changes to "Completed"

3. **Snooze Deadline**
   - Click "Snooze" button
   - Select duration (24 hours)
   - Expected: Due date extends by 24 hours

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

**Evidence**

1. **Upload Evidence**
   - Navigate to Case → Evidence
   - Drag and drop PDF file
   - Expected: Upload progress bar, file appears in list

2. **Preview Evidence**
   - Click on uploaded PDF
   - Expected: PDF viewer opens

3. **Parse Document**
   - Click "Parse Document" on PDF
   - Expected: Text extracted and displayed

4. **Extract Citations**
   - Click "Extract Citations"
   - Expected: Legal citations found and listed

5. **Run OCR** (if scanned PDF available)
   - Click "Run OCR"
   - Expected: Text extracted with confidence score

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Automated Testing

### Unit Tests
```bash
npm test
```
Expected: All tests pass

### E2E Tests (Playwright)
```bash
npm run test:e2e
```
Expected: All critical user flows pass

### Type Checking
```bash
npm run type-check
```
Expected: No TypeScript errors

---

## Performance Testing

### Dashboard Load Time
Open Dashboard and measure load time (Chrome DevTools → Network tab)

- **Target:** < 2 seconds
- **Actual:** _________ seconds
- **Status:** ⬜ Pass (< 2s) | ⬜ Fail (> 2s)

### Search Response Time
Execute search query and measure time

- **Target:** < 100ms
- **Actual:** _________ ms
- **Status:** ⬜ Pass (< 100ms) | ⬜ Fail (> 100ms)

### Chat Streaming
Send message and verify smooth streaming

- **Target:** Token-by-token display, no lag
- **Status:** ⬜ Pass | ⬜ Fail

---

## Error Scenarios

### Session Expiration
1. Wait 24 hours (or manually expire session in backend)
2. Try to perform any action
3. Expected: Redirect to login with "Session expired" message

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

### Network Error
1. Stop backend server
2. Try to load Dashboard
3. Expected: Error message "Cannot connect to server" + Retry button

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

### Invalid Data
1. Try to create case with empty title
2. Expected: Validation error "Title is required"

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Browser Compatibility (Optional)

Test in multiple browsers:
- ⬜ Chrome
- ⬜ Firefox
- ⬜ Edge
- ⬜ Safari (if available)

---

## Sign-Off

### Testing Summary

| Category | Pass | Fail | Not Tested | Notes |
|----------|------|------|------------|-------|
| Authentication | ⬜ | ⬜ | ⬜ | |
| Case Management | ⬜ | ⬜ | ⬜ | |
| AI Chat | ⬜ | ⬜ | ⬜ | |
| Dashboard | ⬜ | ⬜ | ⬜ | |
| Search | ⬜ | ⬜ | ⬜ | |
| Notifications | ⬜ | ⬜ | ⬜ | |
| Tags | ⬜ | ⬜ | ⬜ | |
| Templates | ⬜ | ⬜ | ⬜ | |
| Profile/Settings | ⬜ | ⬜ | ⬜ | |
| GDPR/Export | ⬜ | ⬜ | ⬜ | |
| Deadlines | ⬜ | ⬜ | ⬜ | |
| Evidence | ⬜ | ⬜ | ⬜ | |

### Overall Status

- ⬜ **READY FOR TYPESCRIPT CLEANUP** - All tests pass
- ⬜ **NOT READY** - Issues found (see notes)

### Issues Found

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| | | | |

### Tester Information

- **Name:** _________________
- **Date:** _________________
- **Environment:** Dev | Staging | Production
- **Backend Version:** _________________
- **Frontend Version:** _________________

---

## After Testing Passes

Once all tests pass, proceed to TypeScript cleanup:
1. Review `TYPESCRIPT-FILES-TO-DELETE.md`
2. Create backup: `git add -A && git commit -m "Pre-cleanup backup"`
3. Delete TypeScript services
4. Run tests again to verify
5. Commit: `git commit -m "Remove TypeScript services - migrated to HTTP API"`

---

**Generated:** 2025-01-15
**Purpose:** Pre-cleanup testing verification
**Estimated Time:** 2-3 hours for comprehensive testing
