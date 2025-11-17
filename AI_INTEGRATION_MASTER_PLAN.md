# Justice Companion - AI Integration Master Plan
**Human-in-the-Loop UK Legal Case Management**
**Date:** 2025-11-17
**Method:** MCP Sequential Thinking (15-thought analysis)

---

## Executive Summary

This plan outlines the complete integration of AI into Justice Companion for managing UK legal cases from **first contact → case closure**, with mandatory human oversight at every decision point.

**Core Principle:** AI assists, human decides. No automated legal actions.

**Scope:** All UK civil legal admin work (employment, housing, benefits, consumer, debt, GDPR)

**Architecture:** Event-driven workflow engine with approval queues

---

## 1. CASE LIFECYCLE PHASES

### Phase 1: INTAKE (First Contact)

**Trigger:** User sends first chat message OR uploads first document

**AI Actions:**
1. **Document Upload Path:**
   - Extract text via OCR/parser (PDF, DOCX, images)
   - Identify document type (P45, contract, tribunal notice, etc.)
   - Extract key entities: dates, parties, amounts, addresses
   - Classify case type using legal taxonomy
   - Determine jurisdiction (England/Wales, Scotland, NI)

2. **Chat Message Path:**
   - Analyze user's description via NLP
   - Ask clarifying questions: "When did this happen?", "Have you raised this with your employer?"
   - Extract case facts from conversation
   - Suggest case type: "This sounds like an unfair dismissal case"

**Human Review Checkpoint:**
```
AI PROPOSAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Case Type: Employment - Unfair Dismissal
Jurisdiction: England & Wales
Key Facts Identified:
  • Termination date: 15 Jan 2025
  • Employer: Acme Corp Ltd
  • Reason given: Redundancy
  • Employment started: 10 Mar 2020 (4.8 years service)

NEXT STEPS:
  1. Create case: "Acme Corp Dismissal"
  2. Set initial deadline: ET1 due 14 Apr 2025
  3. Start evidence checklist

[CONFIRM] [EDIT] [REJECT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Database Actions (after approval):**
- Create Case record
- Create CaseFacts records (structured data)
- Create initial Timeline entry
- Create WorkflowState (phase: "intake_complete")
- Create initial AIAction audit entry

---

### Phase 2: EVIDENCE GATHERING

**AI Guidance:**
1. **Generate Evidence Checklist** (case-type specific):
   ```
   For Unfair Dismissal, you typically need:
   ☐ Employment contract
   ☐ P45 / final payslip
   ☐ Dismissal letter
   ☐ Any warning letters
   ☐ Correspondence with employer
   ☐ Witness contact details
   ```

2. **Document Upload Analysis** (per document):
   - Extract text and metadata
   - Classify document type automatically
   - Extract dates → add to timeline
   - Identify parties mentioned
   - Extract monetary amounts
   - Link to relevant evidence checklist items
   - Assess relevance: "This email shows you raised the issue on 5 Jan - strong evidence of procedural unfairness"

3. **Gap Analysis:**
   - Compare uploaded evidence vs. required evidence
   - Identify critical gaps: "Missing: Written contract. Impact: May affect continuity of employment calculation"
   - Suggest how to obtain: "Request via Subject Access Request (GDPR)"

**Human Review per Document:**
```
DOCUMENT ANALYSIS: dismissal_letter.pdf
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document Type: Dismissal Letter (95% confidence)
Date: 15 January 2025
Key Facts Extracted:
  • Termination date: 15 January 2025
  • Notice period: None given
  • Reason stated: "Redundancy"
  • Appeal right mentioned: Yes (14 days)

Timeline Impact: Added "Dismissal" event on 15/01/2025

Evidence Assessment:
  ✓ Relevant: Primary evidence
  ! Issue: No selection criteria mentioned (unfair redundancy?)
  ! Issue: No consultation documented

Add to case as "Dismissal Letter"?
[CONFIRM] [EDIT DETAILS] [REJECT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Database Actions:**
- Create Evidence record (encrypted file storage)
- Create CaseFacts from extracted data
- Update Timeline with new events
- Update evidence checklist progress
- Create AIAction audit for extraction

---

### Phase 3: LEGAL RESEARCH (RAG Integration)

**Trigger:** User asks legal question OR AI needs to support analysis

**RAG Workflow:**
1. **Query Processing:**
   - Extract legal keywords: "unfair dismissal", "redundancy", "selection criteria"
   - Identify legal concepts: Equality Act, Employment Rights Act 1996
   - Determine search scope: case type + jurisdiction

2. **Source Search** (UK-only, authoritative):
   - **Legislation:** legislation.gov.uk API
     - Employment Rights Act 1996 s94-98 (unfair dismissal)
     - Equality Act 2010 (discrimination)
   - **Case Law:**
     - British and Irish Legal Information Institute (BAILII)
     - Employment Tribunal decisions
   - **Guidance:**
     - ACAS Code of Practice
     - gov.uk guidance pages
     - Citizens Advice resources

3. **Context Building:**
   - Rank sources by relevance
   - Extract key passages
   - Build context for AI prompt (max 8000 tokens)

4. **AI Response Generation:**
   - Use GPT-4/Claude with legal system prompt
   - Stream response token-by-token
   - Cite sources inline: "[Employment Rights Act 1996 s98(4)]"
   - End with disclaimer

**Chat Response Format:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For a redundancy to be fair, your employer must follow
a proper procedure including:

1. **Genuine redundancy situation** - the role must
   genuinely no longer be needed [Williams v Compair
   Maxam Ltd [1982]]

2. **Fair selection** - objective criteria applied
   fairly [Employment Rights Act 1996 s98(4)]

3. **Consultation** - meaningful consultation about
   alternatives [Polkey v AE Dayton [1987]]

From your dismissal letter, there's no mention of:
  ⚠️ Selection criteria
  ⚠️ Consultation meetings
  ⚠️ Alternative roles considered

This suggests potential procedural unfairness.

SOURCES:
📖 Employment Rights Act 1996, s98(4)
📖 ACAS Code: Redundancy Handling
📖 Williams v Compair Maxam [1982] IRLR 83

NEXT STEP: Request your employer's redundancy
selection matrix and consultation notes via Subject
Access Request.

[CREATE DEADLINE] [DRAFT SAR LETTER] [MORE INFO]

⚠️ This is information only, not legal advice. For
specific advice, consult a qualified solicitor.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Database Actions:**
- Save ChatMessage (user + assistant)
- Cache LegalSources for reuse
- Update ContextManager with legal research findings
- Link research to case facts

---

### Phase 4: DEADLINE MANAGEMENT

**AI Calculations:**
1. **Statutory Deadlines:**
   - ET1 filing: 3 months minus 1 day from EDT (Effective Date of Termination)
   - ACAS Early Conciliation pause: Add EC period to deadline
   - Appeal deadlines: 42 days for EAT appeals
   - Subject Access Request response: 30 days from receipt

2. **Date Extraction from Documents:**
   - Tribunal hearing notices → add hearing date
   - Disclosure orders → add compliance deadline
   - Settlement offer letters → add expiry date

3. **Critical Path Analysis:**
   - Calculate dependencies: "ACAS EC must complete before ET1 filing"
   - Identify urgent deadlines: "7 days until deadline"

**Example Calculation:**
```
DEADLINE ANALYSIS: ET1 Filing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INPUT DATA:
  Termination date (EDT): 15 Jan 2025
  ACAS EC started: 20 Jan 2025
  ACAS EC ended: 5 Feb 2025 (16 days)

CALCULATION:
  Standard deadline: 15 Jan + 3 months - 1 day
                   = 14 Apr 2025

  ACAS pause period: 16 days

  Extended deadline: 14 Apr + 16 days
                   = 30 Apr 2025

⏰ ET1 MUST BE FILED BY: 30 April 2025
📅 Days remaining: 74 days
🚨 Status: OK (recommend filing by 23 Apr to allow buffer)

Add this deadline to your calendar?
[CONFIRM] [ADJUST DATE] [CANCEL]

References:
• Employment Tribunals Act 1996, s111(2)
• Employment Act 2002 (Dispute Resolution) Regulations
• ACAS Early Conciliation guidance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Human Review Required:**
- User confirms calculated dates are correct
- User sets notification preferences (7 days before, 24 hours before)
- User can override AI calculation if incorrect

**Database Actions:**
- Create Deadline record
- Create AIAction with calculation method
- Set up notification triggers
- Link deadline to source document

---

### Phase 5: DOCUMENT DRAFTING

**Supported Document Types:**
1. **Employment Tribunal:**
   - ET1 (claim form)
   - Witness statements
   - Skeleton arguments
   - Response to employer's ET3

2. **Housing:**
   - Defence to possession claim
   - Disrepair claim letter before action
   - Witness statement for hearing

3. **Benefits:**
   - Mandatory Reconsideration request
   - SSCS1 (tribunal appeal form)

4. **Consumer/Debt:**
   - Letter before action
   - N1 (small claims)
   - N244 (court application)

5. **GDPR:**
   - Subject Access Request
   - Rectification request
   - Erasure request

**Drafting Workflow:**
1. **User Initiates:**
   ```
   User: "I need to write an ET1 claim form"

   AI: "I'll help you draft your ET1. This form starts
   your employment tribunal claim. I'll use the facts
   from your case.

   Before we start:
   ✓ Do you have your ACAS Early Conciliation certificate?
   ✓ Have you checked the deadline (30 Apr 2025)?
   ✓ Are you ready to formally start legal proceedings?

   [BEGIN DRAFTING] [NOT YET]"
   ```

2. **Template Selection:**
   - Load UK-specific template (ET1, N1, etc.)
   - Identify required fields
   - Map case facts to template fields

3. **Content Generation:**
   - Use GPT-4/Claude with legal writing prompt
   - Inject case facts: dates, parties, evidence
   - Cite relevant law
   - Use appropriate legal tone
   - Include mandatory sections

4. **Draft Presentation:**
   ```
   ET1 DRAFT READY FOR REVIEW
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   I've drafted your ET1 claim form using the facts
   from your case. Please review carefully.

   KEY SECTIONS:
   ✓ Section 2: Your details
   ✓ Section 3: Respondent (Acme Corp Ltd)
   ✓ Section 5.1: Employment dates
   ✓ Section 8.2: What you want from tribunal
   ✓ Section 8.2: Details of claim (487 words)

   CLAIMS SELECTED:
   ✓ Unfair dismissal (s94 ERA 1996)
   ✓ Failure to provide written reasons (s92 ERA 1996)

   REMEDY REQUESTED:
   • Reinstatement (primary)
   • Compensation (alternative): £8,450 estimated
     (£6,500 basic + £1,950 compensatory)

   [OPEN IN EDITOR] [DOWNLOAD PDF] [REGENERATE]

   ⚠️ DO NOT FILE until you've reviewed every section.
   Consider having a solicitor review before filing.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

5. **Editor Interface:**
   - Show document with editable fields
   - Highlight AI-inserted data
   - Show sources/reasoning for each section
   - Allow inline editing
   - Track changes

6. **User Approval:**
   - User reviews
   - User edits as needed
   - User marks as "Final"
   - Save to case documents

**Database Actions:**
- Create Document record (draft version)
- Save AIAction with generation params
- Track edit history
- Link document to case
- Update workflow state

---

### Phase 6: CASE ANALYSIS & RECOMMENDATIONS

**Ongoing AI Assessment:**
1. **Evidence Strength Analysis:**
   ```
   CASE STRENGTH ASSESSMENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Based on 12 pieces of evidence uploaded:

   UNFAIR DISMISSAL CLAIM
   Strength: ●●●●◐ STRONG (4.5/5)

   ✓ STRONG EVIDENCE:
     • Dismissal letter shows no consultation
     • Email trail proves you raised concerns first
     • No redundancy selection criteria provided
     • 4.8 years continuous service (meets threshold)

   ⚠️ GAPS:
     • No witness statements yet
     • Employer's redundancy policy not obtained

   Win probability: 65-75% based on similar cases

   COMPARABLE CASES:
   • Smith v ABC Ltd [2023] ET - 70% similar
     → Claimant won, £12,500 award
   • Jones v XYZ Corp [2024] ET - 60% similar
     → Settled pre-hearing, £8,000

   [VIEW DETAILED ANALYSIS] [GET RECOMMENDATIONS]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

2. **Recommended Actions (Prioritized):**
   ```
   RECOMMENDED NEXT STEPS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔴 PRIORITY URGENT (within 7 days):
   □ Contact ACAS Early Conciliation
     Why: Mandatory before ET1 filing
     Deadline: No strict deadline, but don't delay

   🟠 PRIORITY HIGH (within 2 weeks):
   □ Request redundancy selection matrix (SAR)
     Why: Key evidence for unfair selection argument
     How: I can draft the SAR letter

   □ Get witness statement from colleague Sarah
     Why: She saw the consultation that didn't happen
     How: I can draft questions to ask her

   🟡 PRIORITY MEDIUM (within 1 month):
   □ Calculate financial losses
     Why: Needed for compensation claim in ET1
     How: I can help with the calculation

   □ Gather job search evidence
     Why: Reduces compensatory award, shows mitigation

   [ADD TO MY TODO LIST] [CUSTOMIZE PRIORITIES]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

**Human Interaction:**
- User can accept/reject/modify recommendations
- User can reorder priorities
- User can mark actions as complete
- AI learns from user's decisions

**Database Actions:**
- Create RecommendedAction records
- Link to case analysis
- Track acceptance/rejection
- Update WorkflowState

---

### Phase 7: SETTLEMENT NEGOTIATION SUPPORT

**Trigger:** Employer makes settlement offer

**AI Analysis:**
1. **Offer Evaluation:**
   ```
   SETTLEMENT OFFER ANALYSIS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Employer offered: £8,000 (gross)
   Settlement Agreement with compromise on all claims

   STATUTORY ENTITLEMENTS:
   • Notice pay: £1,200 (4 weeks @ £300/week)
   • Holiday pay: £600 (10 days accrued)
   • Redundancy pay: £3,300 (statutory calculation)
   ────────────────────────────────────
   TOTAL MINIMUM OWED: £5,100

   OFFER vs MINIMUM: £8,000 - £5,100 = £2,900 above minimum

   TRIBUNAL PROJECTION:
   If you win at tribunal (65-75% probability):
   • Basic award: £6,500
   • Compensatory award: £8,000 - £15,000
   • Total potential: £14,500 - £21,500

   If you lose: £0 (may have to pay own costs)

   TIME FACTOR:
   • Settlement: Paid within 30 days
   • Tribunal: 6-9 months to hearing + award delay

   TAX IMPLICATIONS:
   • First £30,000 of settlement: Tax-free
   • Notice/holiday pay: Taxable
   • Net amount after tax: ~£7,200

   RECOMMENDATION:
   This offer is BELOW reasonable settlement range.

   Suggested counter-offer: £13,500
   Rationale: Mid-point between offer and low tribunal award

   [ACCEPT OFFER] [COUNTER-OFFER £13,500] [REJECT]
   [CUSTOMIZE COUNTER] [GET MORE ANALYSIS]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

2. **Risk Analysis:**
   - Calculate expected value: (probability × award) - (probability × costs)
   - Factor in stress, time, uncertainty
   - Compare settlement vs tribunal outcomes

3. **Counter-Offer Drafting:**
   - Generate professional counter-offer letter
   - Include justification with case law
   - Set response deadline

**Human Decision:**
- All settlement decisions made by user
- AI provides analysis only
- User can override AI recommendation

**Database Actions:**
- Create SettlementOffer record
- Save AI analysis
- Track negotiation history
- Link to case timeline

---

### Phase 8: HEARING PREPARATION

**Trigger:** Hearing date confirmed

**AI Workflow:**
1. **Bundle Preparation:**
   ```
   HEARING BUNDLE PREPARATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tribunal requires bundle 7 days before hearing.
   Hearing date: 15 May 2025
   Bundle deadline: 8 May 2025 (23 days remaining)

   DOCUMENTS TO INCLUDE (chronological order):
   1. ET1 Claim Form
   2. ET3 Response
   3. Employment Contract (5 Mar 2020)
   4. P45 (15 Jan 2025)
   5. Dismissal Letter (15 Jan 2025)
   ... [47 documents total]

   KEY EVIDENCE FLAGGED:
   📌 Doc 12: Email showing no consultation
   📌 Doc 23: Redundancy selection criteria (missing)
   📌 Doc 34: Your grievance letter (procedural issue)

   BUNDLE STRUCTURE:
   Section A: Claim documents (ET1, ET3)
   Section B: Contract & policies
   Section C: Correspondence
   Section D: Financial documents

   [GENERATE BUNDLE PDF] [PREVIEW] [CUSTOMIZE ORDER]

   Tips:
   • Number all pages continuously
   • Create index with page numbers
   • Highlight key passages
   • Print 3 copies (Tribunal, Respondent, You)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

2. **Witness Preparation:**
   - Generate suggested questions for witnesses
   - Prepare cross-examination Q&A for respondent
   - Draft witness statement templates

3. **Argument Preparation:**
   ```
   HEARING ARGUMENTS OUTLINE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OPENING STATEMENT (2-3 minutes):
   "This case concerns a procedurally unfair
   redundancy dismissal. The Respondent failed to:
   (1) Apply objective selection criteria
   (2) Conduct meaningful consultation
   (3) Consider alternative roles

   I will demonstrate this through documentary
   evidence and witness testimony."

   KEY POINTS TO MAKE:
   1. No selection matrix shown → unfair (Williams)
   2. No consultation meetings → procedural flaw (Polkey)
   3. Alternative roles existed → not genuine redundancy

   RESPONDENT'S LIKELY ARGUMENTS:
   ⚠️ "Genuine redundancy due to business needs"
      → Counter: No evidence of business downturn
      → Refer to: Doc 45 (company accounts show profit)

   ⚠️ "Consultation occurred informally"
      → Counter: No written records, Employment law
         requires formal process
      → Cite: ACAS Code paragraph 23

   CLOSING SUBMISSION POINTS:
   • Law is clear: s98(4) ERA 1996 - burden on employer
   • Evidence shows procedural unfairness
   • Request reinstatement or £14,500 compensation

   [EXPAND OPENING] [DRAFT QUESTIONS] [PRACTICE MODE]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

4. **Timeline Visualization:**
   - Interactive timeline of events
   - Cause-effect relationships highlighted
   - Key dates flagged

**Human Preparation:**
- User reviews all AI suggestions
- User practices with AI Q&A simulation
- User can edit all prepared materials

**Database Actions:**
- Create HearingBundle record
- Generate bundle PDF with page numbers
- Save preparation materials
- Update case status to "hearing_ready"

---

### Phase 9: POST-HEARING ACTIONS

**Scenario A: WIN**
```
CONGRATULATIONS - TRIBUNAL FOUND IN YOUR FAVOUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Judgment: Unfair Dismissal - UPHELD
Award: £14,250 (Basic £6,500 + Compensatory £7,750)

NEXT STEPS:
1. WAIT FOR PAYMENT (28 days from judgment)
   Payment due by: 12 June 2025

2. IF EMPLOYER DOESN'T PAY:
   • Contact ACAS for enforcement advice
   • Consider County Court enforcement
   • I can help draft the claim

3. TAX:
   • First £30,000 tax-free
   • You'll receive: £14,250 (fully tax-free)

Would you like me to:
□ Set reminder for payment deadline
□ Draft enforcement letter (if needed after 28 days)
□ Calculate interest on late payment
□ Close case (after payment received)

[SET REMINDERS] [CLOSE CASE NOW] [EXPORT CASE FILE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Scenario B: LOSE**
```
TRIBUNAL DECISION - CLAIM NOT UPHELD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Judgment: Unfair Dismissal - NOT UPHELD
Reason: Tribunal found redundancy was genuine

I'm sorry this wasn't the outcome you hoped for.

APPEAL OPTIONS:
You have 42 days to appeal to the Employment Appeal
Tribunal (EAT) - deadline: 26 June 2025

Appeals succeed only on:
• Error of law (tribunal misapplied legal test)
• Perversity (decision no reasonable tribunal could reach)
• Procedural irregularity (unfair hearing)

⚠️ Appeals are DIFFICULT and require legal expertise.

INITIAL ASSESSMENT:
I've reviewed the judgment. Potential grounds:
❓ Tribunal may have misapplied Williams test (para 47)
   → This is a question of law
   → Arguable ground for appeal

Would you like me to:
□ Analyze judgment for appeal grounds (detailed)
□ Draft grounds of appeal (requires solicitor review)
□ Find pro bono legal advice (FRU, Law Centres)
□ Close case (no appeal)

[ANALYZE FOR APPEAL] [CLOSE CASE] [GET LEGAL HELP]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Scenario C: SETTLED**
```
CASE SETTLED - AGREEMENT REACHED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Settlement amount: £13,500
Settlement agreement signed: 10 May 2025
Payment due: 7 June 2025

NEXT STEPS:
1. WAIT FOR PAYMENT
2. SIGN WITHDRAWAL FORM (ET1 withdrawal)
3. CASE CLOSES AUTOMATICALLY

DATA RETENTION:
Under GDPR, you have the right to:
• Keep your data (for records)
• Export your data (download all files)
• Delete your data (right to erasure)

Your case contains:
• 47 documents (18.5 MB)
• 23 chat conversations
• 14 deadlines
• Complete case timeline

What would you like to do?
□ Keep everything (stored encrypted)
□ Export to ZIP then delete from app
□ Delete immediately

[KEEP DATA] [EXPORT & DELETE] [DELETE NOW]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Database Actions:**
- Update case status
- Create closure record
- Export case archive (if requested)
- GDPR-compliant deletion (if requested)
- Create AIAction for closure

---

## 2. TECHNICAL ARCHITECTURE

### 2.1 Service Layer Components

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
│  ChatView • CaseView • EvidenceView • TimelineView     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND API (FastAPI)                      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         chat_enhanced.py (existing)              │  │
│  │  • UnifiedAIService                              │  │
│  │  • RAGService                                    │  │
│  │  • ChatService                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         NEW SERVICES (to build)                  │  │
│  │                                                  │  │
│  │  CaseOrchestrator                               │  │
│  │  ├─ Coordinates multi-step workflows           │  │
│  │  ├─ Manages case lifecycle state               │  │
│  │  └─ Triggers AI actions at right times         │  │
│  │                                                  │  │
│  │  WorkflowEngine                                 │  │
│  │  ├─ Executes defined workflows                 │  │
│  │  ├─ Handles events (DocumentUploaded, etc.)    │  │
│  │  └─ Manages approval queues                    │  │
│  │                                                  │  │
│  │  DocumentAnalyzer                               │  │
│  │  ├─ OCR for images/PDFs                        │  │
│  │  ├─ Entity extraction (NER)                    │  │
│  │  ├─ Document classification                    │  │
│  │  └─ Fact extraction                            │  │
│  │                                                  │  │
│  │  DeadlineCalculator                             │  │
│  │  ├─ Statutory deadline rules engine            │  │
│  │  ├─ Date extraction from text                  │  │
│  │  ├─ ACAS EC pause calculation                  │  │
│  │  └─ Critical path analysis                     │  │
│  │                                                  │  │
│  │  TemplateLibrary                                │  │
│  │  ├─ UK legal document templates                │  │
│  │  ├─ Field mapping engine                       │  │
│  │  └─ Document generation                        │  │
│  │                                                  │  │
│  │  CaseAnalyzer                                   │  │
│  │  ├─ Evidence strength assessment               │  │
│  │  ├─ Win probability estimation                 │  │
│  │  ├─ Gap analysis                               │  │
│  │  └─ Recommendation engine                      │  │
│  │                                                  │  │
│  │  SettlementCalculator                           │  │
│  │  ├─ Statutory entitlements calc                │  │
│  │  ├─ Tribunal award estimation                  │  │
│  │  ├─ Tax calculation                            │  │
│  │  └─ Risk analysis                              │  │
│  │                                                  │  │
│  │  LegalAPIService (replace mock)                │  │
│  │  ├─ legislation.gov.uk integration             │  │
│  │  ├─ BAILII case law search                     │  │
│  │  ├─ ACAS guidance                              │  │
│  │  └─ gov.uk content                             │  │
│  │                                                  │  │
│  │  ApprovalQueue                                  │  │
│  │  ├─ Stores pending AI suggestions              │  │
│  │  ├─ Diff tracking                              │  │
│  │  ├─ User approval/rejection                    │  │
│  │  └─ Audit trail                                │  │
│  │                                                  │  │
│  │  ContextManager                                 │  │
│  │  ├─ Maintains conversation memory              │  │
│  │  ├─ Injects case facts into prompts            │  │
│  │  ├─ Token budget management                    │  │
│  │  └─ Context window optimization                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Database Schema Extensions

**NEW TABLES:**

```sql
-- Case Facts (structured data extraction)
CREATE TABLE case_facts (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    fact_type VARCHAR(100) NOT NULL,  -- termination_date, employer_name, etc.
    value TEXT NOT NULL,
    confidence_score REAL,  -- 0.0 to 1.0
    source_type VARCHAR(50),  -- document, chat, user_input
    source_id INTEGER,  -- links to evidence or message
    extracted_at TIMESTAMP,
    verified_by_user BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- AI Actions (audit trail)
CREATE TABLE ai_actions (
    id INTEGER PRIMARY KEY,
    case_id INTEGER,
    action_type VARCHAR(100) NOT NULL,  -- deadline_calculated, document_drafted, etc.
    input_data TEXT,  -- JSON
    output_data TEXT,  -- JSON
    model_used VARCHAR(100),  -- gpt-4-turbo, claude-3-5-sonnet, etc.
    tokens_used INTEGER,
    cost_usd REAL,
    user_approved BOOLEAN,
    user_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Legal Sources (RAG cache)
CREATE TABLE legal_sources (
    id INTEGER PRIMARY KEY,
    source_type VARCHAR(50),  -- legislation, case_law, guidance
    url TEXT UNIQUE,
    title TEXT,
    jurisdiction VARCHAR(50),  -- england_wales, scotland, northern_ireland
    content TEXT,  -- extracted text
    summary TEXT,  -- AI-generated summary
    metadata TEXT,  -- JSON (date, court, etc.)
    relevance_score REAL,
    last_accessed TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow States (track user progress)
CREATE TABLE workflow_states (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL UNIQUE,
    current_phase VARCHAR(100) NOT NULL,  -- intake, evidence_gathering, etc.
    completed_steps TEXT,  -- JSON array
    next_steps TEXT,  -- JSON array
    blocked_on TEXT,  -- what's preventing progress
    last_activity TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Review Queue (pending approvals)
CREATE TABLE review_queue (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    item_type VARCHAR(100) NOT NULL,  -- case_classification, deadline, document_draft, etc.
    item_data TEXT NOT NULL,  -- JSON with the AI suggestion
    diff_data TEXT,  -- changes from current state
    ai_action_id INTEGER,
    priority VARCHAR(20),  -- urgent, high, medium, low
    user_decision VARCHAR(20),  -- approved, rejected, modified, pending
    user_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id),
    FOREIGN KEY (ai_action_id) REFERENCES ai_actions(id)
);

-- Recommended Actions
CREATE TABLE recommended_actions (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    action_type VARCHAR(100),  -- upload_document, draft_letter, etc.
    title VARCHAR(255),
    description TEXT,
    priority VARCHAR(20),  -- urgent, high, medium, low
    deadline DATE,
    reasoning TEXT,  -- why AI recommends this
    status VARCHAR(20),  -- pending, in_progress, completed, dismissed
    created_by VARCHAR(20) DEFAULT 'AI',  -- AI or user
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Settlement Offers
CREATE TABLE settlement_offers (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    offer_amount REAL,
    offer_date DATE,
    response_deadline DATE,
    offer_terms TEXT,
    ai_analysis TEXT,  -- JSON with analysis results
    user_decision VARCHAR(20),  -- accepted, rejected, counter
    counter_amount REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Hearing Bundles
CREATE TABLE hearing_bundles (
    id INTEGER PRIMARY KEY,
    case_id INTEGER NOT NULL,
    hearing_date DATE,
    bundle_deadline DATE,
    document_ids TEXT,  -- JSON array of evidence IDs
    bundle_order TEXT,  -- JSON with section structure
    page_count INTEGER,
    generated_pdf_path TEXT,
    status VARCHAR(20),  -- draft, final, submitted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);
```

### 2.3 Event-Driven Architecture

**Events:**
```python
# Event types
class CaseEvent(Enum):
    CASE_CREATED = "case_created"
    DOCUMENT_UPLOADED = "document_uploaded"
    DOCUMENT_ANALYZED = "document_analyzed"
    CHAT_MESSAGE_SENT = "chat_message_sent"
    DEADLINE_CALCULATED = "deadline_calculated"
    RECOMMENDATION_GENERATED = "recommendation_generated"
    USER_APPROVED = "user_approved"
    USER_REJECTED = "user_rejected"
    HEARING_DATE_SET = "hearing_date_set"
    CASE_CLOSED = "case_closed"

# Event flow example: Document Upload
1. User uploads PDF → DOCUMENT_UPLOADED event
2. DocumentAnalyzer receives event → extracts text/facts → DOCUMENT_ANALYZED event
3. CaseOrchestrator receives event → creates review item → User sees approval UI
4. User approves → USER_APPROVED event
5. WorkflowEngine updates case facts → triggers RECOMMENDATION_GENERATED
6. AI suggests next actions → User sees recommendations
```

---

## 3. UK LEGAL DOMAIN KNOWLEDGE

### 3.1 Case Type Taxonomy

```
Employment
├─ Unfair Dismissal
├─ Constructive Dismissal
├─ Discrimination (Protected Characteristics)
│  ├─ Age
│  ├─ Disability
│  ├─ Gender Reassignment
│  ├─ Marriage/Civil Partnership
│  ├─ Pregnancy/Maternity
│  ├─ Race
│  ├─ Religion/Belief
│  ├─ Sex
│  └─ Sexual Orientation
├─ Redundancy (Unfair Selection)
├─ Wages (Unlawful Deduction)
├─ Working Time Violations
├─ Whistleblowing (Protected Disclosure)
└─ TUPE Transfer Issues

Housing
├─ Disrepair/Unfitness
├─ Possession Claims (Rent Arrears)
├─ Illegal Eviction
├─ Deposit Disputes
├─ Harassment by Landlord
└─ Right to Rent Issues

Benefits
├─ Universal Credit
├─ PIP (Personal Independence Payment)
├─ ESA (Employment Support Allowance)
├─ JSA (Jobseeker's Allowance)
├─ Housing Benefit
└─ Council Tax Support

Consumer
├─ Faulty Goods
├─ Services Not as Described
├─ Refund Disputes
├─ Contract Breaches
└─ Mis-selling

Debt
├─ Credit Card/Loan Arrears
├─ Council Tax Arrears
├─ Rent Arrears
├─ Utility Arrears
└─ Bailiff Action

GDPR/Data
├─ Subject Access Request
├─ Right to Rectification
├─ Right to Erasure
└─ Data Breach Complaints
```

### 3.2 Required Legal Knowledge per Area

**Employment (Priority 1 - MVP):**
- Employment Rights Act 1996 (unfair dismissal, redundancy, TUPE)
- Equality Act 2010 (discrimination)
- ACAS Code of Practice (disciplinary/grievance)
- Working Time Regulations 1998
- National Minimum Wage Act 1998
- Trade Union and Labour Relations Act 1992
- Employment Tribunal procedure rules
- Limitation periods (3 months for most claims)
- ACAS Early Conciliation process
- Compensation calculation methods

**Housing:**
- Housing Act 1988 (assured tenancies)
- Housing Act 2004 (HHSRS - health & safety)
- Protection from Eviction Act 1977
- Landlord and Tenant Act 1985 (repair obligations)
- Tenancy Deposit Scheme regulations
- Rent Repayment Orders
- Possession procedure (N5, N119 forms)
- Disrepair claims protocol

**Benefits:**
- Mandatory Reconsideration process
- Tribunal appeals (SSCS1 form)
- Universal Credit Regulations 2013
- PIP Assessment criteria
- ESA Work Capability Assessment
- Tribunal procedure rules (Social Security)
- Case law on assessments

**Consumer:**
- Consumer Rights Act 2015
- Sale of Goods Act 1979
- Small Claims procedure (N1 form)
- Alternative Dispute Resolution
- Chargeback rights
- Section 75 Consumer Credit Act

**Debt:**
- Taking Control of Goods Regulations 2013 (bailiffs)
- Breathing Space scheme
- Debt Relief Orders
- Individual Voluntary Arrangements (IVAs)
- Bankruptcy
- Council Tax liability

**GDPR:**
- UK GDPR (Data Protection Act 2018)
- ICO guidance
- Subject Access Request process (30 days)
- Right to erasure criteria
- Data breach notification

---

## 4. IMPLEMENTATION PLAN

### Phase 1: MVP - Basic AI Case Management (4 weeks)

**Week 1: Foundation**
- [ ] Fix current chat/upload issues (test with browser MCP)
- [ ] Implement DocumentAnalyzer service
  - PDF/DOCX parser (pypdf2, python-docx)
  - Basic text extraction
  - Document type classifier (rule-based)
- [ ] Create case_facts table
- [ ] Build approval UI component (React)

**Week 2: Case Intake**
- [ ] CaseOrchestrator service skeleton
- [ ] Implement intake workflow:
  - Chat-based intake (extract facts from conversation)
  - Document-based intake (extract from uploaded doc)
- [ ] Entity extraction (dates, parties, amounts)
  - Use spaCy NER or regex patterns
- [ ] Case classification (employment only for MVP)
- [ ] Review/approval flow

**Week 3: Legal Research**
- [ ] Implement LegalAPIService (replace mock)
  - legislation.gov.uk API integration
  - Basic keyword search
  - Source caching
- [ ] Enhance RAGService with UK sources
- [ ] Test legal question answering
- [ ] Citation formatting

**Week 4: Document Drafting MVP**
- [ ] Create TemplateLibrary service
- [ ] Add ET1 template (employment tribunal claim)
- [ ] Implement template merge (case facts → document)
- [ ] Document editor UI
- [ ] Export as PDF

**Deliverable:** User can:
1. Upload employment document → AI extracts facts → User approves → Case created
2. Ask legal question → Get UK-specific answer with sources
3. Draft ET1 claim form → Review/edit → Export PDF

---

### Phase 2: Evidence & Analysis (Weeks 5-12)

**Week 5-6: Evidence Gathering**
- [ ] Enhanced document analysis
  - OCR for scanned PDFs (pytesseract)
  - Image evidence analysis
  - Metadata extraction
- [ ] Evidence checklist generation (case-type specific)
- [ ] Evidence strength assessment
- [ ] Gap analysis

**Week 7-8: Deadline Management**
- [ ] DeadlineCalculator service
- [ ] Statutory deadline rules engine
  - ET1 filing (3 months - 1 day)
  - ACAS EC pause calculation
  - Appeal deadlines
- [ ] Date extraction from documents
- [ ] Calendar integration
- [ ] Notification system

**Week 9-10: Case Analysis**
- [ ] CaseAnalyzer service
- [ ] Win probability estimation (ML model or rule-based)
- [ ] Comparable case search
- [ ] Strength/weakness analysis
- [ ] RecommendedActions engine

**Week 11-12: Additional Document Types**
- [ ] Witness statement template
- [ ] Letter before action template
- [ ] Subject Access Request template
- [ ] Grievance letter template
- [ ] Skeleton argument template

**Deliverable:** Full evidence management + AI-powered case analysis

---

### Phase 3: Full Workflow Automation (Weeks 13-24)

**Week 13-15: All Case Types**
- [ ] Housing case workflows
- [ ] Benefits case workflows
- [ ] Consumer case workflows
- [ ] Debt case workflows
- [ ] GDPR workflows
- [ ] Type-specific templates

**Week 16-18: Settlement & Negotiation**
- [ ] SettlementCalculator service
- [ ] Statutory entitlements calculation
- [ ] Tribunal award estimation
- [ ] Tax calculation
- [ ] Risk analysis
- [ ] Counter-offer generation

**Week 19-21: Hearing Preparation**
- [ ] Hearing bundle generator
- [ ] Document ordering/indexing
- [ ] Page numbering
- [ ] PDF generation
- [ ] Witness preparation tools
- [ ] Argument outliner
- [ ] Q&A simulation

**Week 22-24: Post-Hearing & Closure**
- [ ] Judgment analysis
- [ ] Appeal grounds identification
- [ ] Enforcement tools (if win)
- [ ] Case closure workflow
- [ ] GDPR-compliant data export/deletion

**Deliverable:** Complete case lifecycle coverage

---

### Phase 4: Continuous Improvement (Ongoing)

**ML Enhancements:**
- [ ] Fine-tune model on UK legal data
- [ ] Improve document classification accuracy
- [ ] Better entity extraction (custom NER)
- [ ] Win probability ML model (train on tribunal decisions)

**User Feedback:**
- [ ] Track user approval/rejection rates
- [ ] A/B test AI suggestions
- [ ] Collect user corrections
- [ ] Retrain models

**New Features:**
- [ ] Multi-claimant cases
- [ ] Legal aid eligibility checker
- [ ] Solicitor finder (integrated)
- [ ] Video evidence analysis
- [ ] Voice-to-text case notes

---

## 5. HUMAN-IN-THE-LOOP SAFEGUARDS

### 5.1 Approval Checkpoints (Mandatory)

**Every AI action requires approval for:**
1. Case classification
2. Deadline calculations
3. Document drafts
4. Settlement recommendations
5. Evidence assessments
6. Legal advice interpretations

**Approval UI Pattern:**
```
┌─────────────────────────────────────────┐
│  AI SUGGESTION                          │
│                                         │
│  [AI Analysis/Draft/Calculation]        │
│                                         │
│  Confidence: ●●●●○ (80%)               │
│  Sources: [link] [link]                │
│                                         │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ │
│  │ APPROVE │ │ EDIT     │ │ REJECT  │ │
│  └─────────┘ └──────────┘ └─────────┘ │
│                                         │
│  Feedback (optional):                   │
│  [                                   ]  │
└─────────────────────────────────────────┘
```

### 5.2 Disclaimers (Always Shown)

**Every AI response ends with:**
```
⚠️ This is information only, not legal advice.
For specific advice, consult a qualified solicitor.
```

**Document drafts include header:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ AI-GENERATED DRAFT - REVIEW REQUIRED
This document was created by AI and may contain
errors. You should:
1. Review every section carefully
2. Verify all facts and figures
3. Consider legal advice before filing
4. Take full responsibility for content
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.3 Confidence Scoring

**All AI suggestions include confidence:**
- **90-100%:** High confidence (clear facts, strong precedent)
- **70-89%:** Medium confidence (some ambiguity)
- **50-69%:** Low confidence (uncertain, complex)
- **<50%:** Very low (recommend legal advice)

**Actions based on confidence:**
- <70%: Show warning, recommend solicitor
- <50%: Block automatic actions, require human review

### 5.4 Audit Trail

**Every AI action logged:**
```python
{
  "action_id": 12345,
  "timestamp": "2025-11-17T14:30:00Z",
  "case_id": 42,
  "action_type": "deadline_calculated",
  "input": {
    "termination_date": "2025-01-15",
    "acas_ec_start": "2025-01-20",
    "acas_ec_end": "2025-02-05"
  },
  "output": {
    "deadline": "2025-04-30",
    "confidence": 0.95,
    "reasoning": "Standard 3-month rule + ACAS pause"
  },
  "model": "gpt-4-turbo",
  "user_approved": true,
  "user_modified": false,
  "user_feedback": "Looks correct"
}
```

### 5.5 Explainability

**AI must explain reasoning:**
```
Why did I calculate this deadline?

1. Termination date: 15 Jan 2025 (from your P45)
2. Standard ET1 deadline: 3 months minus 1 day
   = 14 Apr 2025
3. ACAS Early Conciliation: 20 Jan to 5 Feb (16 days)
4. ACAS pause extends deadline: +16 days
5. Final deadline: 30 Apr 2025

Legal basis:
• Employment Tribunals Act 1996, s111(2)
• Employment Act 2002 Regulations

If you think this is wrong, please correct it.
```

---

## 6. TESTING STRATEGY

### 6.1 Manual Testing Checklist

**Test Case 1: Document Upload → Case Creation**
```
1. Navigate to http://localhost:5173
2. Login (create account if needed)
3. Go to Chat view
4. Click document upload button
5. Upload: test_dismissal_letter.pdf
6. Wait for AI analysis
7. Verify: AI extracts termination date, employer name
8. Verify: AI suggests case type "Employment - Unfair Dismissal"
9. Click APPROVE
10. Verify: Case created in Cases view
11. Verify: Document appears in Evidence section
✓ PASS / ✗ FAIL
```

**Test Case 2: Legal Question → RAG Response**
```
1. In Chat view, type: "Can my employer fire me for being sick?"
2. Wait for AI response (streaming)
3. Verify: Response mentions UK law (Employment Rights Act, ACAS)
4. Verify: Response cites sources (links shown)
5. Verify: Disclaimer shown at end
6. Click on source link
7. Verify: Opens legislation.gov.uk or similar UK source
✓ PASS / ✗ FAIL
```

**Test Case 3: Deadline Calculation**
```
1. Create case with termination date: 15 Jan 2025
2. Add ACAS EC dates: start 20 Jan, end 5 Feb
3. Click "Calculate ET1 Deadline"
4. Verify: AI shows calculation breakdown
5. Verify: Final deadline = 30 Apr 2025
6. Click APPROVE
7. Go to Deadlines view
8. Verify: Deadline appears with correct date
9. Verify: Calendar alert set
✓ PASS / ✗ FAIL
```

**Test Case 4: Document Drafting**
```
1. Open existing employment case
2. Click "Draft ET1 Claim"
3. AI asks clarifying questions
4. Answer questions in chat
5. Wait for draft generation
6. Verify: Draft appears in editor
7. Verify: Case facts populated correctly
8. Edit Section 8.2 (add detail)
9. Click "Save as Final"
10. Download PDF
11. Open PDF, verify formatting
✓ PASS / ✗ FAIL
```

### 6.2 Current Issues to Fix First

**Based on earlier testing:**
1. ✗ Frontend not running (port 5173 connection refused)
2. ✗ Multiple backend instances (need to kill duplicates)
3. ? Chat upload functionality (untested)
4. ? General chat functionality (untested)

**Fix sequence:**
```bash
# 1. Kill all backend instances
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*"

# 2. Start backend cleanly
cd "F:\Justice Companion take 2"
python -m uvicorn backend.main:app --reload --port 8000

# 3. In new terminal, start frontend
npm run dev

# 4. Wait for "Local: http://localhost:5173"

# 5. Open browser to http://localhost:5173

# 6. Test chat upload
```

---

## 7. NEXT STEPS - IMMEDIATE ACTIONS

### Step 1: Fix Current Application (TODAY)
- [ ] Kill duplicate backend processes
- [ ] Restart backend with .env loaded (AI configured)
- [ ] Start frontend development server
- [ ] Test chat functionality
- [ ] Test document upload
- [ ] Document current state (what works, what doesn't)

### Step 2: Implement Quick Wins (THIS WEEK)
- [ ] Fix document upload endpoint (if broken)
- [ ] Add basic document text extraction (PDF → text)
- [ ] Show extracted text in chat
- [ ] Add approval button UI

### Step 3: Start Phase 1 MVP (NEXT 4 WEEKS)
- [ ] Follow Phase 1 implementation plan
- [ ] Build DocumentAnalyzer service
- [ ] Create case intake workflow
- [ ] Implement basic RAG
- [ ] Add ET1 template

---

## 8. SUCCESS METRICS

**Phase 1 Success:**
- [ ] 90% of uploaded documents successfully analyzed
- [ ] Legal Q&A returns UK-relevant answers with sources
- [ ] ET1 draft generated in <30 seconds
- [ ] User approval rate >80% for AI suggestions

**Phase 2 Success:**
- [ ] Evidence gaps identified correctly (90% accuracy)
- [ ] Deadline calculations accurate (100% - critical)
- [ ] Case strength assessment matches solicitor review

**Phase 3 Success:**
- [ ] Full case lifecycle supported (all types)
- [ ] Settlement recommendations accepted >60% of time
- [ ] Hearing bundles generated error-free

**Overall Success:**
- [ ] Users successfully manage cases from start to finish
- [ ] Zero AI decisions made without user approval
- [ ] All disclaimers shown correctly
- [ ] Audit trail complete for all actions

---

## KNOWLEDGE GRAPH DOCUMENTATION

All plans documented in MCP knowledge graph (next step):
- Entity: "AI Case Management Lifecycle" (15-phase design)
- Entity: "Human-in-the-Loop Architecture" (approval patterns)
- Entity: "UK Legal Domain Model" (case types, forms, laws)
- Entity: "Implementation Roadmap" (4 phases, 24 weeks)
- Relations: Components → Services, Workflows → Checkpoints

---

**Generated by:** Claude Code using MCP Sequential Thinking
**Analysis depth:** 15 thoughts covering full lifecycle
**Scope:** First message/upload → Case closed
**Focus:** Human-in-the-loop, UK legal admin, production-ready
