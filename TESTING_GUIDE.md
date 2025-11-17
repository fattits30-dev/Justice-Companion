# Justice Companion - Manual Testing Guide
**AI Integration Testing**
**Date:** 2025-11-17

---

## Browser MCP Limitation

The MCP browser tool cannot access your localhost from the Docker container (networking issue).

**Solution:** You test manually and report back what works/breaks.

---

## PRE-TEST CHECKLIST

Before testing, verify:
- [x] Frontend running on http://localhost:5176
- [x] Backend running on http://localhost:8000
- [ ] Can access http://localhost:5176 in your browser
- [ ] Can access http://localhost:8000/health (should show `{"status":"healthy"}`)

---

## TEST 1: BASIC NAVIGATION

**Steps:**
1. Open browser to http://localhost:5176
2. Do you see the Justice Companion login/register screen?
3. Register a new account OR login with existing account

**Report:**
```
TEST 1 RESULT:
- Login screen visible: YES / NO
- Can register: YES / NO
- Can login: YES / NO
- After login, main dashboard visible: YES / NO
- Any errors in browser console (F12): [paste here]
```

---

## TEST 2: NAVIGATE TO CHAT

**Steps:**
1. After logging in, find and click "Chat" or "AI Assistant" in navigation
2. Do you see a chat interface?
3. Check browser console (F12) for errors

**Report:**
```
TEST 2 RESULT:
- Chat view accessible: YES / NO
- Chat input field visible: YES / NO
- Send button visible: YES / NO
- Any errors: [paste here]
```

---

## TEST 3: SEND CHAT MESSAGE (AI STREAMING)

**Steps:**
1. In chat input, type: "Hello, can you help me with an employment issue?"
2. Click Send
3. Watch for AI response

**What to check:**
- Does response stream word-by-word? (or appear all at once?)
- Is it a REAL AI response? (legal-sounding, UK-specific)
- OR is it the OLD mock response: "This is a streaming response token by token..."

**Report:**
```
TEST 3 RESULT:
- Message sends: YES / NO
- AI responds: YES / NO
- Response is REAL AI (not mock): YES / NO
- Response streams token-by-token: YES / NO
- Response mentions UK law: YES / NO
- Any errors in console: [paste here]

ACTUAL AI RESPONSE (first 200 chars):
[paste what the AI said]
```

---

## TEST 4: DOCUMENT UPLOAD IN CHAT

**Steps:**
1. In chat view, look for upload/attachment button (paperclip icon or similar)
2. Click upload button
3. Select a test file (any PDF, DOCX, or TXT)
4. Upload it

**What to check:**
- Does upload button exist?
- Does file picker open?
- Does file upload successfully?
- Does AI analyze the document?
- What does AI say about the document?

**Report:**
```
TEST 4 RESULT:
- Upload button visible: YES / NO
- File picker opens: YES / NO
- File uploads: YES / NO
- Upload progress shown: YES / NO
- AI analyzes document: YES / NO
- AI response about document: [paste response]
- Any errors: [paste here]
```

---

## TEST 5: CHECK BACKEND LOGS

**Steps:**
1. Look at the terminal where backend is running
2. After sending chat message, check logs
3. After uploading document, check logs

**What to look for:**
- `POST /chat/stream` requests
- `POST /chat/upload-document` requests
- Any error messages
- AI provider initialization messages

**Report:**
```
TEST 5 RESULT - Backend Logs:
[paste relevant log lines, especially errors]
```

---

## TEST 6: BROWSER NETWORK TAB

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Send a chat message
4. Check network requests

**What to look for:**
- POST request to `/chat/stream`
- Status code (200 = success, 500 = server error, etc.)
- Response (is it SSE stream?)

**Report:**
```
TEST 6 RESULT:
- POST /chat/stream request appears: YES / NO
- Status code: [200, 500, 404, etc.]
- Response type: [text/event-stream, application/json, etc.]
- If error status, response body: [paste here]
```

---

## CRITICAL TESTS SUMMARY

After all tests, answer:

**CHAT FUNCTIONALITY:**
1. Can you send messages? **YES / NO**
2. Do you get AI responses? **YES / NO**
3. Are responses REAL AI (not mock)? **YES / NO**

**UPLOAD FUNCTIONALITY:**
4. Can you find upload button? **YES / NO**
5. Can you upload files? **YES / NO**
6. Does AI analyze uploaded files? **YES / NO**

**If ANY answer is NO, that's what we need to fix.**

---

## EXPECTED BEHAVIOR (When Working Correctly)

### Chat Message Flow:
```
1. You type: "Can they fire me for being sick?"

2. AI streams response like this:
   "In the UK, dismissing someone due to sickness
   can be unfair dismissal under the Employment
   Rights Act 1996...

   [continues with UK-specific legal info]

   Sources:
   📖 Employment Rights Act 1996
   📖 ACAS Code of Practice

   ⚠️ This is information only, not legal advice."

3. Response appears word-by-word (streaming)
4. No mock text like "This is a streaming response..."
```

### Document Upload Flow:
```
1. You click paperclip/upload icon

2. File picker opens

3. You select: dismissal_letter.pdf

4. Upload progress bar (optional)

5. AI responds:
   "I've analyzed your document. This appears to be
   a dismissal letter dated [DATE]. I've extracted:
   - Employer: [NAME]
   - Termination date: [DATE]
   - Reason stated: [REASON]

   Would you like me to create a case based on this?"

6. Document appears in case evidence (if case exists)
```

---

## TROUBLESHOOTING QUICK CHECKS

**If chat doesn't work:**
- [ ] Check: Is AI_PROVIDER set in .env? (should be `huggingface`)
- [ ] Check: Is AI_API_KEY set in .env? (should start with `hf_`)
- [ ] Check: Backend logs show "AI client initialized"?
- [ ] Check: Browser console shows network error or CORS error?

**If upload doesn't work:**
- [ ] Check: Is upload button visible in UI?
- [ ] Check: Does clicking it do anything?
- [ ] Check: Browser console errors when clicking?
- [ ] Check: Network tab shows POST to `/chat/upload-document`?

---

## WHAT TO SEND BACK TO ME

Copy this filled template:

```
=== JUSTICE COMPANION TEST RESULTS ===

TEST 1 - NAVIGATION:
- Login works: [YES/NO]
- Dashboard visible: [YES/NO]

TEST 2 - CHAT VIEW:
- Chat accessible: [YES/NO]
- UI looks correct: [YES/NO]

TEST 3 - SEND MESSAGE:
- Can send: [YES/NO]
- AI responds: [YES/NO]
- Real AI (not mock): [YES/NO]
- Streams word-by-word: [YES/NO]
- First 200 chars of response:
  "[paste here]"

TEST 4 - UPLOAD:
- Upload button exists: [YES/NO]
- Can upload file: [YES/NO]
- AI analyzes file: [YES/NO]

CONSOLE ERRORS:
[paste any errors from browser console F12]

BACKEND LOG ERRORS:
[paste any errors from backend terminal]

NETWORK TAB:
- POST /chat/stream status: [200/500/404/etc]
- Response type: [text/event-stream/json/etc]
```

---

**Once you send me this, I'll:**
1. Identify exactly what's broken
2. Create fixes
3. Test the fixes
4. Document in knowledge graph

---

**Ready to test? Open http://localhost:5176 and follow the steps above!**
