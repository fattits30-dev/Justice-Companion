---
name: ai-legal-research
description: "OpenAI-powered legal research with UK legal API integration (legislation.gov.uk, caselaw.nationalarchives.gov.uk). Implements RAG pipeline for context-aware legal queries. Use when implementing AI chat features, legal document retrieval, or case law searches."
allowed-tools: ["Bash", "Read", "Write", "Edit", "Grep", "WebFetch", "mcp__puppeteer__*", "mcp__context7__*"]
---

# AI Legal Research Skill

## Purpose
Integrate OpenAI GPT-4 with UK legal databases for context-aware legal research with proper citations and disclaimers.

## When Claude Uses This
- Implementing AI chat features
- Legal document retrieval
- Case law searches
- Citation generation
- Building RAG pipelines for legal context

## Architecture

### OpenAI Integration
```typescript
// src/services/OpenAIService.ts
import OpenAI from 'openai';

interface LegalQuery {
  question: string;
  caseContext?: string;
  jurisdiction: 'UK' | 'England' | 'Scotland' | 'Wales' | 'NI';
}

interface LegalResponse {
  answer: string;
  sources: Array<{
    type: 'legislation' | 'case-law';
    title: string;
    url: string;
    relevance: number;
  }>;
  disclaimer: string;
}
```

### UK Legal APIs

**1. Legislation.gov.uk API**
- Base URL: `https://www.legislation.gov.uk/`
- Format: XML (parse with fast-xml-parser)
- Types: Acts, Statutory Instruments, UK Public General Acts

**2. National Archives Case Law API**
- Base URL: `https://caselaw.nationalarchives.gov.uk/`
- Format: JSON
- Coverage: All UK courts and tribunals

### RAG Pipeline Workflow

```
1. User Query → Extract Legal Terms
2. Search UK Legal APIs → Retrieve Relevant Documents
3. Chunk Documents → Create Embeddings
4. Query OpenAI with Context → Generate Response
5. Cite Sources → Add Mandatory Disclaimer
```

## Implementation Checklist

### Phase 1: OpenAI Setup
- [ ] Install: `pnpm add openai`
- [ ] Create `src/services/OpenAIService.ts`
- [ ] Store API key in `.env`: `OPENAI_API_KEY=sk-...`
- [ ] Implement streaming responses
- [ ] Add token usage tracking

### Phase 2: UK Legal API Integration
- [ ] Create `src/services/UKLegalAPIService.ts`
- [ ] Implement legislation.gov.uk parser
- [ ] Implement caselaw search
- [ ] Add response caching (24hr TTL)
- [ ] Handle rate limiting (respectful scraping)

### Phase 3: RAG Implementation
- [ ] Document chunking (max 512 tokens/chunk)
- [ ] Vector embeddings with OpenAI `text-embedding-3-small`
- [ ] Similarity search (cosine similarity)
- [ ] Context injection into prompts
- [ ] Source attribution

### Phase 4: UI Integration
- [ ] Chat interface component (`src/features/chat/AIChat.tsx`)
- [ ] Streaming message display
- [ ] Source citations UI
- [ ] Disclaimer footer (always visible)
- [ ] Copy/export responses

## Critical Requirements

### Legal Disclaimer (MANDATORY)
Every AI response MUST include:
```
⚠️ DISCLAIMER: This is information, not legal advice.
Consult a qualified solicitor for your specific situation.
```

### Data Privacy (GDPR)
- [ ] User consent before sending queries to OpenAI
- [ ] Option to disable AI features
- [ ] Audit log all AI queries
- [ ] No PII sent to OpenAI without explicit consent

### Rate Limiting
```typescript
// Max queries per user
const RATE_LIMITS = {
  free: 10 / day,
  pro: 100 / day,
  enterprise: unlimited
};
```

## Example Usage

### Puppeteer Web Scraping (Case Law)
```bash
# Use puppeteer MCP to scrape case law
mcp__puppeteer__navigate https://caselaw.nationalarchives.gov.uk/
mcp__puppeteer__fill "input[name='query']" "employment discrimination"
mcp__puppeteer__click "button[type='submit']"
```

### Context7 for Library Docs
```bash
# Get latest OpenAI SDK docs
mcp__context7__get-library-docs openai
```

## Testing Strategy

### Unit Tests
- OpenAI API mocking (vitest)
- Legal API response parsing
- Disclaimer injection validation

### E2E Tests
- Complete RAG pipeline
- Streaming responses
- Source citation accuracy
- Rate limiting enforcement

## Performance Targets
- Response time: < 3s for cached queries
- First token: < 500ms (streaming)
- API calls: Batch where possible
- Caching: 24hr TTL for legal documents

## Error Handling
- OpenAI API failures → Graceful degradation
- Legal API timeouts → Show cached results
- Rate limit exceeded → Clear user message
- Invalid queries → Suggest reformulation

## References
- OpenAI Node.js SDK: https://github.com/openai/openai-node
- Legislation.gov.uk API: https://www.legislation.gov.uk/developer
- Case Law API: https://caselaw.nationalarchives.gov.uk/about-this-service
- GDPR Compliance: Track user consents in `consent_logs` table
