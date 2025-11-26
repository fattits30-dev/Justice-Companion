# Deferred to v2.0

This directory contains features and infrastructure intentionally deferred to version 2.0.

## Why Deferred?

1. **Focus on MVP** - Core case management features must work first
2. **Avoid Over-Engineering** - Keep the codebase simple and maintainable
3. **User Needs First** - AI features are "nice to have", not essential for v1.0

## Contents

### ai-service/
Python FastAPI microservice for AI-powered legal assistance.

**Features (not yet integrated):**
- DocumentAnalyzerAgent - Analyze legal documents
- CaseSuggesterAgent - Case management suggestions
- ConversationAgent - Chat with streaming
- LegalResearcherAgent - UK legal research with RAG

**Status:** Complete Python service, NOT integrated with frontend
**Reason Deferred:** Core case management features incomplete

## When to Restore

Restore these features when:
1. Cases, Evidence, Timeline features are 100% complete
2. E2E tests passing for all core features
3. User testing validates core features work
4. Team capacity available for AI integration

## How to Restore

```bash
# Move ai-service back to project root
mv _deferred_v2/ai-service ./ai-service

# Install dependencies
cd ai-service
pip install -r requirements.txt

# Run service
python main.py
```

## Related Frontend Code (NOT deferred)

The following frontend files remain in src/ as they're lightweight type stubs:
- `src/types/ai.ts` - AI chat message types
- `src/types/ai-providers.ts` - Provider configuration
- `src/types/ai-functions.ts` - Fact categorization types
- `src/views/SettingsView.tsx` - AI provider settings UI (functional but not connected)
- `src/views/ChatView.tsx` - Chat UI (functional but uses backend /chat endpoint)

These are kept because:
1. They're used by working code
2. They're lightweight (~350 lines total)
3. They'll be needed when AI is restored

---

**Last Updated:** 2025-11-26
**Deferred By:** Simplification Phase 3
