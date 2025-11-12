# Python AI Migration - Phase Tracking

**Status:** Phase 1 COMPLETED ✅

## Overview

Migrating Justice Companion's AI functionality from TypeScript to Python FastAPI microservice.

**Architecture:**
- Python FastAPI service (port 5050)
- Electron manages Python subprocess via PythonProcessManager
- Agent-based design: one agent = one responsibility
- Prompts stored as versioned text files
- TypeScript fallback during entire migration

---

## ✅ Phase 1: Foundation Setup (Week 1) - COMPLETED

**Goal:** Create Python service infrastructure and Electron integration.

### Completed Tasks:
- ✅ Created `ai-service/` directory structure
- ✅ Created `requirements.txt` with dependencies
- ✅ Created `main.py` with FastAPI server
- ✅ Created `PythonProcessManager.ts` for subprocess management
- ✅ Created `AIHttpClient.ts` for HTTP communication
- ✅ Updated `electron/main.ts` with Python service integration
- ✅ Created `base_agent.py` abstract class
- ✅ Stored architectural plan in Memory MCP

### Files Created:
- `ai-service/requirements.txt`
- `ai-service/main.py`
- `ai-service/agents/base_agent.py`
- `electron/services/PythonProcessManager.ts`
- `electron/services/AIHttpClient.ts`

### Files Modified:
- `electron/main.ts` (added Python service startup/shutdown)

### Next Steps:
1. Install Python dependencies: `cd ai-service && pip install -r requirements.txt`
2. Test Python service startup: `python main.py`
3. Test Electron integration: `npm run electron:dev`
4. Verify health check endpoint: `curl http://localhost:5050/health`

---

## 📋 Phase 2: Document Analyzer Migration (Week 2)

**Goal:** Migrate document analysis logic from UnifiedAIService.ts to Python agent.

### Tasks:
- [ ] Extract document analysis prompt from UnifiedAIService.ts
- [ ] Create `prompts/v1/document_analysis.txt`
- [ ] Create Pydantic models in `models/requests.py` and `models/responses.py`
- [ ] Implement `DocumentAnalyzerAgent` in `agents/document_analyzer.py`
- [ ] Create FastAPI endpoint `/api/v1/analyze-document` in `main.py`
- [ ] Update AIHttpClient.ts to call Python endpoint
- [ ] Update IPC handler `ai:analyze-document` with Python + TypeScript fallback
- [ ] Write integration tests
- [ ] Deploy to 10% of users with feature flag

### Success Criteria:
- Document analysis works via Python service
- Fallback to TypeScript if Python service fails
- Tests pass (unit + integration)
- No regression in document analysis accuracy

### Files to Create:
- `ai-service/agents/document_analyzer.py`
- `ai-service/models/requests.py`
- `ai-service/models/responses.py`
- `ai-service/prompts/v1/document_analysis.txt`

### Files to Modify:
- `ai-service/main.py` (add endpoint)
- `electron/ipc-handlers/chat.ts` (add fallback)

### Estimated Time: 1 week

---

## 📋 Phase 3: Case Suggester Migration (Week 3)

**Goal:** Migrate case suggestion logic to Python agent.

### Tasks:
- [ ] Extract case suggestion prompt to `prompts/v1/case_suggester.txt`
- [ ] Create `CaseSuggesterAgent` in `agents/case_suggester.py`
- [ ] Add Pydantic models for case suggestion request/response
- [ ] Create FastAPI endpoint `/api/v1/suggest-case` in `main.py`
- [ ] Update AIHttpClient.ts with `suggestCase()` method
- [ ] Update IPC handlers with Python + TypeScript fallback
- [ ] Write integration tests
- [ ] Deploy to 50% of users

### Success Criteria:
- Case suggestions work via Python service
- Fallback to TypeScript functional
- Tests pass
- Performance within 10% of TypeScript version

### Files to Create:
- `ai-service/agents/case_suggester.py`
- `ai-service/prompts/v1/case_suggester.txt`

### Files to Modify:
- `ai-service/models/requests.py` (add models)
- `ai-service/models/responses.py` (add models)
- `electron/ipc-handlers/cases.ts` (add fallback)

### Estimated Time: 1 week

---

## 📋 Phase 4: Conversation Agent Migration (Week 4)

**Goal:** Migrate AI chat/conversation logic to Python agent.

### Tasks:
- [ ] Extract conversation prompts to `prompts/v1/conversation.txt`
- [ ] Create `ConversationAgent` in `agents/conversation.py`
- [ ] Implement streaming chat with Server-Sent Events (SSE)
- [ ] Add Pydantic models for chat request/response
- [ ] Create endpoints `/api/v1/chat` and `/api/v1/chat/stream`
- [ ] Update AIHttpClient.ts with `sendChatMessage()` and `streamChat()`
- [ ] Update IPC handlers for streaming + fallback
- [ ] Write integration tests including stream testing
- [ ] Deploy to 100% of users

### Success Criteria:
- Chat works via Python service with streaming
- Fallback to TypeScript functional
- Streaming performance <100ms first token
- Tests pass

### Files to Create:
- `ai-service/agents/conversation.py`
- `ai-service/prompts/v1/conversation.txt`

### Files to Modify:
- `ai-service/main.py` (add SSE endpoint)
- `electron/ipc-handlers/chat.ts` (update)
- `electron/services/AIHttpClient.ts` (add streaming)

### Estimated Time: 1 week

---

## 📋 Phase 5: Legal Researcher Migration (Week 5)

**Goal:** Migrate legal research logic to Python agent.

### Tasks:
- [ ] Extract legal research prompts to `prompts/v1/legal_researcher.txt`
- [ ] Create `LegalResearcherAgent` in `agents/legal_researcher.py`
- [ ] Integrate RAG pipeline for UK legal APIs
- [ ] Create `LegalAPIClient` in `services/legal_api_client.py`
- [ ] Add Pydantic models for research request/response
- [ ] Create endpoint `/api/v1/research-legal` in `main.py`
- [ ] Update AIHttpClient.ts with `researchLegal()` method
- [ ] Write integration tests with UK legal API mocking
- [ ] Deploy to 100% of users

### Success Criteria:
- Legal research works via Python service
- RAG pipeline integrated correctly
- Citations and sources working
- Tests pass

### Files to Create:
- `ai-service/agents/legal_researcher.py`
- `ai-service/services/legal_api_client.py`
- `ai-service/prompts/v1/legal_researcher.txt`

### Files to Modify:
- `ai-service/main.py` (add endpoint)
- `electron/ipc-handlers/chat.ts` (update)

### Estimated Time: 1 week

---

## 📋 Phase 6: Cleanup & Production Readiness (Week 6)

**Goal:** Remove TypeScript AI code, finalize production deployment.

### Tasks:
- [ ] Remove TypeScript fallback code
- [ ] Delete `UnifiedAIService.ts` (~1000 lines)
- [ ] Delete `AIServiceFactory.ts`
- [ ] Delete `AISDKService.ts`
- [ ] Delete `AIFunctionDefinitions.ts`
- [ ] Delete `AIToolDefinitions.ts`
- [ ] Delete `RAGService.ts`
- [ ] Delete `LegalAPIService.ts`
- [ ] Configure PyInstaller for bundling
- [ ] Update electron-builder config for Python binary
- [ ] Write E2E tests for all agents
- [ ] Update documentation
- [ ] Deploy to 100% of users

### Success Criteria:
- All TypeScript AI code removed
- Python service bundled with Electron app
- All tests passing (unit + integration + E2E)
- Production builds working on Windows/macOS/Linux
- Documentation updated

### Files to Delete:
- `src/services/UnifiedAIService.ts`
- `src/services/AIServiceFactory.ts`
- `src/services/ai/AISDKService.ts`
- `src/services/AIFunctionDefinitions.ts`
- `src/services/AIToolDefinitions.ts`
- `src/services/RAGService.ts`
- `src/services/LegalAPIService.ts`

### Files to Modify:
- `package.json` (update build scripts)
- `electron-builder config` (add Python binary)
- `README.md` (update architecture docs)

### Estimated Time: 1 week

---

## Testing Strategy

### Unit Tests
- Each agent has pytest unit tests
- Mock OpenAI API responses
- Test prompt loading and caching
- Test error handling

### Integration Tests
- Test Electron ↔ Python communication
- Test PythonProcessManager lifecycle
- Test AIHttpClient retry logic
- Test fallback to TypeScript

### E2E Tests
- Test full document analysis flow
- Test streaming chat
- Test legal research with citations
- Test Python service crash recovery

### Performance Tests
- Measure response times for each agent
- Measure Python service startup time
- Measure memory usage
- Compare to TypeScript baseline

---

## Rollback Plan

If issues occur during any phase:

1. **Immediate:** Set feature flag to 0% (disable Python service)
2. **Fallback:** TypeScript code handles all AI operations
3. **Investigate:** Check Python service logs (`pythonManager.getStatus()`)
4. **Fix:** Address issue in Python code
5. **Redeploy:** Gradual rollout (10% → 50% → 100%)

---

## MCP Integration

### Memory MCP
- Store architectural decisions
- Track prompt versions
- Store migration progress

### GitHub MCP
- Create issues on errors
- Track agent performance metrics
- Auto-create bug reports

### Playwright MCP
- Automate UK legal research testing
- Scrape legal databases for RAG

### Sequential Thinking MCP
- Used for complex architectural decisions
- Used for debugging multi-step failures

---

## Metrics to Track

### Performance
- Response time per agent
- Python service uptime
- Crash frequency
- Memory usage

### Quality
- Test pass rate
- User feedback rating
- Accuracy of AI responses
- Citation accuracy (legal research)

### Adoption
- % users on Python service
- Fallback trigger frequency
- Error rate

---

## Contact & Support

**Architecture Questions:** See Sequential Thinking analysis in Memory MCP
**Implementation Issues:** Check PYTHON_AI_MIGRATION_PHASES.md
**Testing:** See `ai-service/tests/` directory

---

**Last Updated:** 2025-11-11
**Phase 1 Completed By:** Claude Code
**Next Phase:** Phase 2 - Document Analyzer Migration
