# Hugging Face MCP Server Setup Guide

**Status:** ✓ Configured in `.mcp.json`
**Package:** `@huggingface/mcp-server`
**Tools Available:** 7+ specialized AI model and dataset tools

---

## Quick Setup

### 1. Get Your Hugging Face API Token

1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name it: `Justice Companion MCP`
4. Select token type:
   - **Read:** Access public models and datasets
   - **Write:** Upload models, create repos, use Inference API
5. Copy the token (starts with `hf_`)

### 2. Add Token to Environment Variables

**Option A: System Environment Variables (Recommended for Windows)**

```powershell
# PowerShell (Run as Administrator)
[System.Environment]::SetEnvironmentVariable('HF_TOKEN', 'hf_xxxxxxxxxxxxxxxxxxxx', 'User')
```

**Option B: .env File (For Development)**

Add to `.env` in project root:
```bash
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
```

### 3. Restart Claude Code

Close Claude Code completely and relaunch to load the new environment variable.

### 4. Verify Installation

```bash
# Check MCP server status
claude mcp list

# Should show:
# ✓ huggingface - Connected
```

---

## What You Can Do with Hugging Face MCP

### 1. Model Discovery
Find AI models for specific tasks:
- Legal document classification (legal-bert, longformer-legal)
- Named entity recognition (NER for legal entities)
- Text summarization (BART, T5, Pegasus)
- Question answering (RoBERTa, ALBERT)
- Embeddings (sentence-transformers)

### 2. Dataset Access
Download and use 100k+ datasets:
- Legal case datasets
- Contract analysis datasets
- Legal question-answering datasets
- Court opinion datasets

### 3. Inference API
Run AI models without hosting them:
- Text classification
- Named entity extraction
- Text generation
- Embeddings for semantic search
- Summarization

### 4. Model Hosting
Deploy custom models for Justice Companion features:
- Document categorization (contracts, briefs, evidence)
- Entity extraction (parties, dates, citations)
- Legal text summarization
- Semantic search for case law

---

## Example Use Cases for Justice Companion

### Use Case 1: Legal Document Classification

```typescript
// Use Hugging Face MCP to classify uploaded documents
// "Is this a contract, brief, evidence, or other?"

1. User uploads PDF to Evidence
2. Extract text with DocumentParserService
3. Use Hugging Face Inference API with legal-bert model
4. Classify document type automatically
5. Tag evidence with classification
```

**Models to try:**
- `nlpaueb/legal-bert-base-uncased`
- `mukund/topic-classification-using-legal-bert`
- `lexlms/legal-roberta-base`

### Use Case 2: Entity Extraction from Legal Documents

```typescript
// Extract parties, dates, citations automatically

1. User uploads legal document
2. Extract text
3. Use Hugging Face NER model
4. Extract:
   - Party names (plaintiff, defendant)
   - Dates (filing date, hearing date)
   - Case citations
   - Statutes referenced
5. Auto-populate case metadata
```

**Models to try:**
- `law-ai/InLegalBERT`
- `lex_glue/eurlex`

### Use Case 3: Legal Text Summarization

```typescript
// Summarize lengthy case opinions or contracts

1. User views long document (50+ pages)
2. Click "Summarize" button
3. Use Hugging Face summarization model
4. Generate 3-paragraph summary
5. Display in sidebar for quick reference
```

**Models to try:**
- `facebook/bart-large-cnn`
- `google/pegasus-legal`
- `philschmid/bart-large-cnn-samsum`

### Use Case 4: Semantic Search Enhancement

```typescript
// Improve search with embeddings

1. User searches for "wrongful termination evidence"
2. Generate query embedding with sentence-transformers
3. Compare against embeddings of all evidence documents
4. Rank by semantic similarity (not just keyword match)
5. Return most relevant evidence
```

**Models to try:**
- `sentence-transformers/all-MiniLM-L6-v2`
- `sentence-transformers/legal-bert-base-uncased`

---

## Available MCP Tools (Approximate)

Based on typical Hugging Face MCP implementations:

1. **`search_models`** - Search 500k+ models by task, language, framework
2. **`get_model_info`** - Get model metadata, downloads, usage stats
3. **`search_datasets`** - Search datasets by task, language, size
4. **`get_dataset_info`** - Get dataset metadata, splits, features
5. **`inference`** - Run inference on Hugging Face Inference API
6. **`download_model`** - Download model files for local inference
7. **`create_model_repo`** - Create new model repository (requires write token)

---

## Integration Roadmap for Justice Companion

### Phase 1: Research & Prototyping (1 week)
- [ ] Test legal-bert models with sample Justice Companion documents
- [ ] Benchmark inference speeds (cloud vs local)
- [ ] Evaluate accuracy on real legal documents
- [ ] Estimate API costs for Inference API

### Phase 2: Document Classification (2 weeks)
- [ ] Add "Auto-Classify" feature to Evidence upload
- [ ] Integrate legal-bert for document type detection
- [ ] Add confidence scores to classifications
- [ ] Allow manual override of auto-classification

### Phase 3: Entity Extraction (2 weeks)
- [ ] Add NER to Evidence parser
- [ ] Extract parties, dates, citations automatically
- [ ] Pre-populate case metadata fields
- [ ] Add entity linking to case details

### Phase 4: Summarization (1 week)
- [ ] Add "Summarize" button to document viewer
- [ ] Generate 3-level summaries (brief, standard, detailed)
- [ ] Cache summaries in database
- [ ] Add summary to search results

### Phase 5: Semantic Search (3 weeks)
- [ ] Generate embeddings for all evidence on upload
- [ ] Store embeddings in SQLite vector extension
- [ ] Implement hybrid search (keyword + semantic)
- [ ] Add "Similar documents" feature

---

## Cost Considerations

### Hugging Face Inference API Pricing (as of 2024)

**Free Tier:**
- 10,000 requests/month
- Rate limited to 10 req/min
- Good for prototyping

**Pro Subscription ($9/month):**
- 100,000 requests/month
- Higher rate limits
- Faster inference

**Enterprise:**
- Custom pricing for high volume
- Dedicated endpoints
- Private models

### Recommended Approach for Justice Companion

1. **Use Free Tier for MVP** - 10k requests sufficient for small user base
2. **Self-Host Models** - Download and run locally for privacy-sensitive data
3. **Hybrid Approach** - Free models for basic tasks, Inference API for complex ones

---

## Privacy & Security Considerations

### Data Privacy
- **Inference API sends data to Hugging Face servers** - Do NOT use for sensitive case data
- **Solution:** Download models and run locally with transformers.js or onnxruntime
- **Local inference:** 100% private, no data leaves user's machine

### Recommended Models for Local Inference
- **Lightweight:** `distilbert-base-uncased` (66MB)
- **Legal-Specific:** `nlpaueb/legal-bert-small` (133MB)
- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (91MB)

### Implementation Example (Local Inference)
```typescript
import { pipeline } from '@xenova/transformers';

// Load model once on app start (caches locally)
const classifier = await pipeline('text-classification', 'nlpaueb/legal-bert-base-uncased');

// Use offline for all classifications
const result = await classifier('This is a contract for employment services.');
// Output: [{ label: 'CONTRACT', score: 0.98 }]
```

---

## Testing the MCP Server

Once configured, try these commands in Claude Code:

**Search for legal models:**
```
Use Hugging Face MCP to search for "legal document classification" models
```

**Get model details:**
```
Use Hugging Face MCP to get info about nlpaueb/legal-bert-base-uncased
```

**Search for legal datasets:**
```
Use Hugging Face MCP to find datasets for legal question answering
```

**Run inference:**
```
Use Hugging Face MCP Inference API to classify this text:
"The plaintiff alleges wrongful termination under the Employment Rights Act 1996."
```

---

## Troubleshooting

### Error: "Authentication failed"
**Cause:** Invalid or missing HF_TOKEN
**Fix:**
1. Verify token at https://huggingface.co/settings/tokens
2. Check environment variable is set: `echo $env:HF_TOKEN` (PowerShell)
3. Restart Claude Code

### Error: "Rate limit exceeded"
**Cause:** Exceeded free tier limits (10 req/min or 10k/month)
**Fix:**
1. Wait for rate limit to reset
2. Upgrade to Pro subscription
3. Download models for local inference

### Error: "Model not found"
**Cause:** Model name misspelled or private model
**Fix:**
1. Search for model on huggingface.co
2. Verify model is public
3. Use exact model ID (e.g., `nlpaueb/legal-bert-base-uncased`)

### MCP Server Not Connecting
**Fix:**
1. Check `.mcp.json` syntax is correct
2. Run `pnpm install` to ensure npx has access to packages
3. Restart Claude Code completely
4. Check logs: Open Claude Code Developer Tools

---

## Next Steps

1. **Get HF Token:** https://huggingface.co/settings/tokens
2. **Add to Environment Variables** (see Step 2 above)
3. **Restart Claude Code**
4. **Test:** Try "Use Hugging Face MCP to search for legal models"
5. **Prototype:** Test legal-bert model on sample Justice Companion documents
6. **Implement:** Add auto-classification to Evidence upload (Phase 2)

---

## Resources

**Hugging Face Documentation:**
- MCP Server Docs: https://github.com/huggingface/huggingface-mcp
- Inference API Docs: https://huggingface.co/docs/api-inference
- Legal Models: https://huggingface.co/models?pipeline_tag=text-classification&search=legal

**Justice Companion Integration:**
- See `SPRINT_PLAN.md` for AI integration roadmap
- See `CLAUDE.md` for full MCP server documentation
- See `.mcp.json` for server configuration

**Questions?**
- Hugging Face Discord: https://hf.co/join/discord
- Justice Companion Issues: (create GitHub issue)

---

**Last Updated:** 2025-11-03
**Status:** ✓ Configured and ready to use
**Next Review:** After initial testing with legal-bert models
