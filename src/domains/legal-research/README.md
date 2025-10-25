# Legal Research Domain

## Overview

The Legal Research domain provides AI-powered legal research capabilities with integration to UK legal databases, RAG (Retrieval-Augmented Generation) pipeline, and intelligent search functionality.

## Domain Components

### Entities

- **LegalIssue** (`entities/LegalIssue.ts`): Legal issues identified in a case with relevant law and guidance
- **SearchQuery** (`entities/SearchQuery.ts`): Search queries with filters, results, and execution metrics

### Domain Events

- **ResearchPerformed** (`events/ResearchPerformed.ts`): Fired when legal research is conducted

## External API Integrations

### UK Legal APIs
- **legislation.gov.uk**: UK legislation database
  - Primary and secondary legislation
  - Statutory instruments
  - Historical versions
- **caselaw.nationalarchives.gov.uk**: UK case law
  - Court judgments
  - Tribunal decisions
  - Citations and references

### AI Integration
- **OpenAI GPT-4**: Legal analysis and summarization
- **RAG Pipeline**: Context-aware responses
- **Embeddings**: Semantic search capabilities

## Research Capabilities

### Search Types
- **Legislation Search**: Find relevant acts, regulations, statutory instruments
- **Case Law Search**: Discover precedents, judgments, tribunal decisions
- **Combined Search**: Comprehensive search across all sources

### Search Filters
- **Jurisdiction**: England & Wales, Scotland, Northern Ireland
- **Date Range**: Historical and current law
- **Court Level**: Supreme Court, Court of Appeal, High Court, etc.
- **Legislation Type**: Acts, Regulations, Orders, Rules

### AI Features
- **Summarization**: Condense complex legal texts
- **Citation Extraction**: Identify relevant citations
- **Issue Spotting**: Detect legal issues in case facts
- **Precedent Analysis**: Find similar cases
- **Legal Guidance**: Practical application advice

## Business Rules

### Research Constraints
- Results limited to UK law only
- Mandatory disclaimer: "This is information, not legal advice"
- Citations required for all legal statements
- Source verification for accuracy
- Rate limiting: 100 requests per hour

### Quality Assurance
- Dual-source verification
- Citation cross-checking
- Date validation (current law vs historical)
- Relevance scoring
- Confidence levels on AI responses

## RAG Pipeline

### Document Processing
1. **Retrieval**: Fetch relevant documents from APIs
2. **Chunking**: Split documents into processable segments
3. **Embedding**: Generate semantic embeddings
4. **Ranking**: Score by relevance to query

### Response Generation
1. **Context Assembly**: Combine relevant chunks
2. **Prompt Engineering**: Structure query with context
3. **Generation**: AI produces response
4. **Citation Injection**: Add source references
5. **Validation**: Verify accuracy and completeness

## Dependencies

- Cases domain for case context
- OpenAI API for AI capabilities
- UK Legal APIs for source data
- Caching service for API responses
- Audit logger for research tracking

## Usage Examples

```typescript
import { SearchQuery, LegalIssue, ResearchPerformed } from '@/domains/legal-research';

// Create search query
const query: SearchQuery = {
  id: 'uuid-here',
  caseId: 42,
  userId: 123,
  query: 'unfair dismissal notice period',
  searchType: 'combined',
  filters: {
    jurisdiction: 'england-wales',
    dateRange: {
      from: '2020-01-01',
      to: '2024-12-31'
    },
    courtLevel: ['employment-tribunal', 'employment-appeal-tribunal']
  },
  createdAt: new Date().toISOString()
};

// Process search results
const results = {
  count: 15,
  relevantCitations: [
    'Employment Rights Act 1996, s.86',
    'British Home Stores v Burchell [1980] ICR 303'
  ],
  executionTime: 2500 // milliseconds
};

// Create research event
const researchEvent = new ResearchPerformed(
  query.id,
  query.caseId,
  query.userId,
  query.query,
  query.searchType,
  {
    resultsCount: results.count,
    sources: ['legislation.gov.uk', 'caselaw.nationalarchives.gov.uk'],
    executionTime: results.executionTime,
    model: 'gpt-4',
    relevantCitations: results.relevantCitations,
    issueTags: ['employment', 'dismissal', 'notice-period']
  }
);
```

## Performance Optimization

### Caching Strategy
- API responses cached for 24 hours
- Embeddings cached permanently
- Search results cached for 1 hour
- Popular queries pre-computed

### Rate Limiting
- API calls: 100/hour per user
- AI generations: 50/hour per user
- Bulk operations: 10/hour
- Emergency override available

## Testing

- Unit tests for search query building
- Integration tests with mock APIs
- E2E tests for research workflow
- Performance tests for RAG pipeline
- Test coverage target: 75%+

## Compliance & Ethics

### Legal Disclaimer
All responses include:
> "This information is provided for research purposes only and does not constitute legal advice. Please consult a qualified legal professional for advice specific to your situation."

### Data Protection
- No client data sent to external APIs
- Anonymized queries only
- Local caching of results
- Audit trail of all searches

### Accuracy Standards
- Minimum 95% citation accuracy
- Source verification required
- Regular validation against official sources
- Human review for critical cases

## Future Enhancements

- European law integration
- International treaty search
- Legal forms generation
- Contract analysis
- Risk assessment tools
- Predictive case outcomes
- Natural language legal queries
- Voice-activated research