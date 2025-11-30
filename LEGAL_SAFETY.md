# Legal Safety & Security Checklist

> **Why This Matters**: This app handles sensitive legal data for vulnerable users. Legal missteps could expose users to liability. Security failures could compromise their cases.

## 🔴 Legal Liability Protection

### AI Disclaimers (MANDATORY)

**Every AI interaction MUST include:**

✅ **Visible UI Disclaimer** (currently implemented in ChatView):

```
⚠️ I AM NOT A LAWYER AND THIS IS NOT LEGAL ADVICE
- This is a legal information tool
- Nothing I provide constitutes legal advice
- You must consult a qualified legal professional
- Laws change frequently - verify current requirements
```

✅ **System Prompt Disclaimer** (verify in every AI call):
Every system prompt sent to AI providers MUST start with:

```
You are a legal information assistant for UK civil law.
CRITICAL: You provide INFORMATION only, NOT ADVICE.

Rules:
1. Never say "you should" - say "options to consider include"
2. Never say "the best approach" - present multiple approaches
3. Always cite sources (gov.uk, legislation.gov.uk, Citizens Advice)
4. Always remind users to verify with a solicitor
5. Present multiple options, not single recommendations
```

**TODO - Audit Needed:**

- [ ] Verify EVERY AI endpoint includes system disclaimer
- [ ] Check document analysis prompts
- [ ] Check case creation prompts
- [ ] Check deadline calculation prompts
- [ ] Check evidence analysis prompts

---

## 🔴 Data Security (GDPR Compliance)

### User Data Protection

**✅ Currently Implemented:**

- End-to-end encryption for case data
- Local-first architecture (PWA)
- User's own AI API keys (no data sent to our servers)
- No PII in logs

**⚠️ Needs Verification:**

- [ ] **Encryption at rest**: Verify all sensitive data encrypted in SQLite
- [ ] **Key rotation**: Encryption keys can be rotated safely
- [ ] **Data deletion**: Permanent deletion actually deletes
- [ ] **Export functionality**: Users can export their data
- [ ] **Backup security**: Backups are encrypted

### Testing Requirements:

```typescript
describe('Data Security', () => {
  it('encrypts case data at rest', async () => {
    const caseData = await createCase({sensitive: 'data'});
    const raw = await readRawDatabase();
    expect(raw).not.toContain('data'); // encrypted
  });

  it('user can export all their data', async () => {
    const export = await exportUserData();
    expect(export).toContainAll(userCases);
  });

  it('deletion is permanent', async () => {
    await deleteCase(caseId);
    const export = await exportUserData();
    expect(export).not.toContain(caseId);
  });
});
```

---

## 🟡 Accuracy & Sources

### Information Accuracy

**Requirements:**

1. **Cite sources for all legal info**
   - ✅ Link to gov.uk pages
   - ✅ Link to legislation.gov.uk
   - ✅ Reference Citizens Advice
   - ❌ NEVER make up information

2. **Deadline calculations MUST be accurate**
   - Employment tribunal: 3 months minus 1 day from incident
   - Small claims: 6 years for breach of contract
   - Housing disrepair: varies by claim type
   - **NEVER guess** - if unsure, say so and cite source

3. **Present multiple options**
   - Not "you should file X form"
   - Instead: "Options to consider: Form A (for...), Form B (for...), consult solicitor about which applies"

**Testing Strategy:**

```typescript
describe("AI Responses", () => {
  it("includes source citations", async () => {
    const response = await askAI("What is the ET deadline?");
    expect(response).toMatch(/gov\.uk|legislation\.gov\.uk|acas\.org\.uk/);
  });

  it("presents multiple options", async () => {
    const response = await askAI("How do I respond to eviction?");
    const options = extractOptions(response);
    expect(options.length).toBeGreaterThan(1);
  });

  it("includes disclaimer in every response", async () => {
    const response = await askAI("Any question");
    expect(response).toContain("not legal advice");
    expect(response).toContain("consult");
  });
});
```

---

## 🟡 Error Handling for Vulnerable Users

### Graceful Degradation

**Users are stressed and don't have backup options. Failures must be gentle:**

**❌ BAD**:

```
Error: ENOENT /app/data/cases.db
Stack trace: ...
```

**✅ GOOD**:

```
We couldn't load your cases right now.

What to try:
1. Check your internet connection
2. Try restarting the app
3. If problem persists, export your data (Settings > Backup)

Your data is safe and stored locally.
Need help? [Contact Support]
```

**Critical Features Need Redundancy:**

- Deadlines: Also show in notifications, email reminders
- Data: Automatic backups, export functionality
- AI: Graceful fallback when AI unavailable

---

## 🟢 Privacy & Transparency

### Open Source Responsibilities

**Users can audit the code. Make it clear:**

1. **Where data goes**:

   ```typescript
   // ✅ GOOD - Explicit comment
   // This data is sent to YOUR configured AI provider
   // using YOUR API key. We never see it.
   const response = await aiProvider.chat(messages);
   ```

2. **What gets logged**:

   ```typescript
   // ✅ GOOD - No PII
   logger.info("Case created", { caseId, caseType, userId: hash(userId) });

   // ❌ BAD - Contains PII
   logger.info("Case created", { caseId, username, caseName });
   ```

3. **Third-party services**:
   - Document which services are called (AI providers, OCR)
   - Make clear user controls which services via API keys
   - Never call services without user configuration

---

## Testing Checklist

### Before Each Release:

**Legal Protection:**

- [ ] All AI responses include disclaimers
- [ ] System prompts emphasize "information not advice"
- [ ] UI shows warnings at every AI interaction point
- [ ] PDF exports include disclaimer footer

**Data Security:**

- [ ] Encryption test passes
- [ ] Export/import test passes
- [ ] Deletion test passes (data actually gone)
- [ ] Backup test passes

**Accuracy:**

- [ ] Deadline calculations tested against official sources
- [ ] AI responses cite sources
- [ ] Multiple options presented, not single "advice"

**Privacy:**

- [ ] No PII in logs
- [ ] No unexpected network calls
- [ ] User's API key used, not ours

**Error Handling:**

- [ ] All P0 features have graceful fallbacks
- [ ] Error messages are user-friendly
- [ ] Data loss scenarios tested

---

## For Developers

**When adding ANY AI feature:**

1. Add system prompt with disclaimer FIRST
2. Add visible UI disclaimer
3. Ensure sources are cited
4. Present options, not recommendations
5. Test with real legal scenarios

**When handling user data:**

1. Encrypt if sensitive
2. Don't log PII
3. Provide export functionality
4. Test deletion works

**When calculating deadlines:**

1. Cite official source
2. Add safety margin warning
3. Recommend professional verification
4. Test edge cases (weekends, bank holidays)

---

## Red Flags to Audit

If you see any of these, **stop and fix immediately**:

🚨 AI response without disclaimer
🚨 Deadline calculated without source
🚨 Single recommendation instead of options
🚨 "You should..." instead of "Options include..."
🚨 PII in logs
🚨 Unencrypted sensitive data
🚨 Network call to unconfigured service
🚨 Error message exposes technical details to stressed user
🚨 Missing export functionality
🚨 Deletion that doesn't actually delete

---

## Legal Insurance

**Recommendation: Get Professional Indemnity Insurance**

Even with disclaimers, someone might sue. Consider:

- Coverage for "information services"
- Coverage for "software errors"
- Legal defense costs
- Open source project rider

**Document everything:**

- Keep audit trail of all safety measures
- Document testing procedures
- Save evidence of disclaimers shown
- Record user acceptance of terms

This helps demonstrate "reasonable care" if challenged.
