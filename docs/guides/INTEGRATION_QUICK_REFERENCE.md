# Integration Quick Reference Card

## 🚀 What's Working (Copy-Paste Ready)

### 1. Search UK Legislation
```typescript
import { legalAPIService } from './services/LegalAPIService';

// Search for legislation
const results = await legalAPIService.searchLegislation(['unfair dismissal']);

// Results:
[
  {
    title: "Employment Rights Act 1996",
    section: "Section 94",
    content: "An employee has the right not to be unfairly dismissed...",
    url: "https://www.legislation.gov.uk/ukpga/1996/18/section/94",
    relevance: 1.0
  }
]
```

### 2. Search UK Case Law
```typescript
// Search with court filtering
const results = await legalAPIService.searchCaseLaw(
  ['unfair dismissal'],
  'employment' // Auto-filters to EAT, UKSC, EWCA
);

// Results:
[
  {
    citation: "Smith v ABC Ltd [2024] EAT 123",
    court: "Employment Appeal Tribunal",
    date: "2024-01-15",
    summary: "Claimant dismissed without proper procedure...",
    url: "https://caselaw.nationalarchives.gov.uk/eat/2024/123",
    relevance: 1.0
  }
]
```

### 3. Stream AI Chat with RAG
```typescript
import { aiServiceFactory } from './services/AIServiceFactory';

// Streaming with legal context
await aiServiceFactory.streamChat(
  {
    messages: [{ role: 'user', content: 'Explain unfair dismissal law' }],
    context: {
      legislation: [...],
      caseLaw: [...],
      knowledgeBase: []
    }
  },
  (token) => console.log('Token:', token),
  () => console.log('Complete'),
  (error) => console.error('Error:', error),
  (thinkToken) => console.log('Thinking:', thinkToken),
  (sources) => console.log('Sources:', sources)
);
```

### 4. AI Function Calling (Case Memory)
```typescript
// Enable function calling for case-specific conversations
await aiServiceFactory.streamChatWithFunctions(
  {
    messages: [{ role: 'user', content: 'I was dismissed on 2024-01-15' }],
    caseId: 42 // AI can now call store_case_fact and get_case_facts
  },
  42, // caseId
  (token) => console.log(token),
  () => console.log('Complete'),
  (error) => console.error(error)
);

// AI Response:
// [[call: store_case_fact({caseId: 42, factType: "timeline", factKey: "dismissal_date", factValue: "2024-01-15", confidence: 1.0})]]
```

---

## ❌ What's Missing (Needs Implementation)

### 1. Document Analysis (P0)
```typescript
// MISSING: src/services/DocumentAnalysisService.ts
import { documentAnalysisService } from './services/DocumentAnalysisService';

const analysis = await documentAnalysisService.analyzeDocument('/path/to/contract.pdf');

// Expected Result:
{
  summary: "Employment contract between John Smith and ABC Ltd...",
  keyDates: [
    { date: "2024-01-15", context: "dismissal date", relevance: "high" }
  ],
  parties: [
    { name: "John Smith", type: "person", mentions: 5 },
    { name: "ABC Ltd", type: "organization", mentions: 3 }
  ],
  amounts: [
    { amount: 25000, currency: "GBP", context: "compensation claimed" }
  ],
  legalIssues: ["unfair dismissal", "breach of contract"],
  timeline: [
    { date: "2024-01-15", description: "Employee dismissed", source: "page 1" }
  ]
}
```

**Implementation**: See `INTEGRATION_AUDIT_REPORT.md` Section 4.1 (800+ lines of code)

### 2. Legal Citation Extraction (P1)
```typescript
// MISSING: src/services/LegalCitationService.ts
import { legalCitationService } from './services/LegalCitationService';

const citations = await legalCitationService.extractCitations(documentText);

// Expected Result:
[
  {
    type: "legislation",
    citation: "Employment Rights Act 1996 s.94",
    normalized: "Employment Rights Act 1996 s.94",
    url: "https://www.legislation.gov.uk/ukpga/1996/18/section/94",
    verified: true,
    context: "...under the Employment Rights Act 1996 s.94...",
    position: 123
  },
  {
    type: "caselaw",
    citation: "Smith v Jones [2024] UKSC 123",
    normalized: "Smith v Jones [2024] UKSC 123",
    url: "https://caselaw.nationalarchives.gov.uk/uksc/2024/123",
    verified: true,
    context: "...as held in Smith v Jones [2024] UKSC 123...",
    position: 456
  }
]
```

**Implementation**: See `INTEGRATION_AUDIT_REPORT.md` Section 4.2 (300+ lines of code)

### 3. Knowledge Base (P2)
```typescript
// MISSING: src/services/KnowledgeBaseService.ts
import { knowledgeBaseService } from './services/KnowledgeBaseService';

// Create entry
const entry = knowledgeBaseService.create({
  topic: "Unfair Dismissal",
  category: "Employment",
  content: "An employee has the right not to be unfairly dismissed...",
  sources: ["https://www.acas.org.uk/unfair-dismissal"],
  keywords: ["dismissal", "employment", "unfair", "tribunal"]
});

// Search
const results = knowledgeBaseService.search("unfair dismissal");
```

**Implementation**: See `INTEGRATION_AUDIT_REPORT.md` Section 4.3 (400+ lines of code)

---

## 🔑 Key API Endpoints

### legislation.gov.uk
```
GET https://www.legislation.gov.uk/ukpga/data.feed?title={query}
Format: Atom XML
Rate Limit: None
Caching: 24 hours recommended
```

### Find Case Law
```
GET https://caselaw.nationalarchives.gov.uk/atom.xml?query={query}&court={court}
Format: Atom XML
Rate Limit: None
Caching: 24 hours recommended
```

**Court Codes**:
- `uksc` - UK Supreme Court
- `eat` - Employment Appeal Tribunal
- `ewca` - Court of Appeal
- `ewhc` - High Court
- `ukut` - Upper Tribunal
- `ewfc` - Family Court

---

## 📊 Progress Dashboard

### Services Status
| Service | Status | Lines | Priority |
|---------|--------|-------|----------|
| LegalAPIService | ✅ | 947 | P0 |
| IntegratedAIService | ✅ | 676 | P0 |
| RAGService | ✅ | 334 | P0 |
| DocumentAnalysisService | ❌ | 0 | **P0** |
| LegalCitationService | ❌ | 0 | **P1** |
| KnowledgeBaseService | ⚠️ | 10 | P2 |

### Overall Completion: 67% (6/9 components)

---

## 🛠️ Implementation Checklist

### Phase 7: Document Analysis (3 days)
- [ ] Create `DocumentAnalysisService.ts` (800+ lines)
- [ ] Install `mammoth` for DOCX support
- [ ] Add IPC handler `DOCUMENT_ANALYZE`
- [ ] Create React hook `useDocumentAnalysis.ts`
- [ ] Create UI component `DocumentAnalysisPanel.tsx`
- [ ] Test with sample legal documents

### Phase 8: Legal Citation Extraction (2 days)
- [ ] Create `LegalCitationService.ts` (300+ lines)
- [ ] Add regex patterns for UK citations
- [ ] Integrate with DocumentAnalysisService
- [ ] Add citation display in UI
- [ ] Test with sample legal texts

### Phase 9: Knowledge Base (3 days)
- [ ] Create `KnowledgeBaseService.ts` (400+ lines)
- [ ] Add SQLite FTS5 support
- [ ] Create admin panel `KnowledgeBaseManager.tsx`
- [ ] Update `LegalAPIService.searchKnowledgeBase()`
- [ ] Test with sample FAQs

---

## 🐛 Common Issues & Solutions

### Issue: "Model not found"
```typescript
// Solution: Check model path
const modelPath = path.join(app.getPath('userData'), 'models', 'Qwen_Qwen3-8B-Q4_K_M.gguf');
if (!fs.existsSync(modelPath)) {
  console.error('Model file missing:', modelPath);
  // Download from Hugging Face
}
```

### Issue: "VRAM overflow"
```typescript
// Solution: Dispose sequences after use
await contextSequence.dispose(); // Clear KV cache
```

### Issue: "API rate limiting"
```typescript
// Solution: Use caching
const cached = this.getCached<LegalSearchResults>(cacheKey);
if (cached) return cached; // Return cached result
```

---

## 📚 File Locations

### Services
- `src/services/LegalAPIService.ts` - ✅ 947 lines
- `src/services/IntegratedAIService.ts` - ✅ 676 lines
- `src/services/RAGService.ts` - ✅ 334 lines
- `src/services/AIServiceFactory.ts` - ✅ 223 lines
- `src/services/ai-functions.ts` - ✅ 248 lines
- `src/services/DocumentAnalysisService.ts` - ❌ Missing (P0)
- `src/services/LegalCitationService.ts` - ❌ Missing (P1)
- `src/services/KnowledgeBaseService.ts` - ❌ Missing (P2)

### UI Components
- `src/features/chat/components/ChatWindow.tsx` - ✅ 172 lines
- `src/features/chat/components/MessageList.tsx` - ✅ 131 lines
- `src/features/chat/components/MessageBubble.tsx` - ✅ 126 lines
- `src/features/chat/hooks/useAI.ts` - ✅ 416 lines

### IPC Handlers
- `electron/main.ts` - ✅ AI_STREAM_START (lines 743-898)

---

## 🔗 Related Documents

1. **INTEGRATION_AUDIT_REPORT.md** (13,000+ words)
   - Complete technical analysis
   - 3 full service implementations (1,500+ lines of code)
   - Step-by-step implementation guide

2. **INTEGRATION_AUDIT_SUMMARY.md** (3,000+ words)
   - Quick overview with status matrix
   - Progress tracking dashboard
   - Key takeaways and recommendations

3. **CLAUDE.md** (project instructions)
   - Current implementation status
   - Phase completion tracking
   - Development guidelines

---

**Last Updated**: 2025-10-08
**Next Steps**: Implement Phase 7 (Document Analysis - P0)
