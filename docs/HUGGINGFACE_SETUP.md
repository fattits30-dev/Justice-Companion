# Hugging Face Pro Integration Setup

## Overview

Justice Companion uses Hugging Face Pro for:
- **Inference API:** AI-powered legal research (Llama 3.1 70B)
- **Spaces:** Staging deployments and public demo
- **Datasets:** Large-scale performance testing
- **AutoTrain:** Future ML features (v1.1.0)

---

## Prerequisites

1. **Hugging Face Pro Account** ($9/month)
   - Sign up: https://huggingface.co/pricing
   - Includes: Inference API, Spaces, AutoTrain

2. **API Token** (Read/Write permissions)
   - Go to: https://huggingface.co/settings/tokens
   - Create token: "justice-companion-dev"
   - Permissions: `read`, `write`
   - Copy token for `.env` file

---

## Step 1: Inference API Setup

### 1.1 Get API Token
```bash
# Add to .env file
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
```

### 1.2 Choose Model
**Recommended:** `meta-llama/Meta-Llama-3.1-70B-Instruct`
- **Strengths:** Legal reasoning, long context (128K tokens)
- **Cost:** $0.002/1K tokens (93% cheaper than OpenAI GPT-4)
- **Alternatives:**
  - `mistralai/Mixtral-8x22B-Instruct-v0.1` (multilingual)
  - `Qwen/Qwen2.5-72B-Instruct` (best performance)

### 1.3 Test Connection
```bash
curl https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-70B-Instruct \
  -X POST \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "What is GDPR Article 17?", "parameters": {"max_new_tokens": 250}}'
```

**Expected Response:**
```json
[
  {
    "generated_text": "GDPR Article 17 is the Right to Erasure, also known as the right to be forgotten..."
  }
]
```

---

## Step 2: Spaces Setup (Staging)

### 2.1 Create Private Space
1. Go to: https://huggingface.co/new-space
2. **Name:** `justice-companion-staging`
3. **Visibility:** Private
4. **SDK:** Docker
5. **Hardware:** CPU Basic (free tier)

### 2.2 Link GitHub Repository
```bash
# In Space settings → Repository
# Connect: github.com/yourusername/justice-companion
# Branch: develop
# Auto-deploy: On push to develop
```

### 2.3 Configure Space
Create `Dockerfile` in Space:
```dockerfile
FROM node:20.18.0-bookworm-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 7860

CMD ["pnpm", "preview", "--host", "0.0.0.0", "--port", "7860"]
```

### 2.4 Deploy
```bash
git push origin develop
# Space auto-builds and deploys
# Access: https://huggingface.co/spaces/yourusername/justice-companion-staging
```

---

## Step 3: Datasets Setup

### 3.1 Create Test Dataset
1. Go to: https://huggingface.co/new-dataset
2. **Name:** `justice-companion-test-data`
3. **Visibility:** Private
4. **License:** MIT

### 3.2 Upload Sample Data
```bash
# Install datasets library
pip install datasets

# Upload from Python
from datasets import load_dataset, Dataset
import json

# Load your test data
with open('test-data/cases.json', 'r') as f:
    cases = json.load(f)

dataset = Dataset.from_dict({"cases": cases})
dataset.push_to_hub("yourusername/justice-companion-test-data", private=True)
```

### 3.3 Load in Tests
```typescript
// In your test files
import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HF_TOKEN);

async function loadTestData() {
  const response = await fetch(
    "https://huggingface.co/datasets/yourusername/justice-companion-test-data/resolve/main/data/train-00000-of-00001.parquet"
  );
  return await response.json();
}
```

---

## Step 4: Migration from OpenAI to HF Inference

### 4.1 Install HF SDK
```bash
pnpm add @huggingface/inference
```

### 4.2 Update IntegratedAIService
```typescript
// src/features/chat/services/IntegratedAIService.ts

import { HfInference } from "@huggingface/inference";

export class IntegratedAIService {
  private hf: HfInference;
  private model = "meta-llama/Meta-Llama-3.1-70B-Instruct";

  constructor() {
    this.hf = new HfInference(process.env.HF_TOKEN);
  }

  async generateResponse(prompt: string): Promise<string> {
    const response = await this.hf.textGeneration({
      model: this.model,
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
        return_full_text: false,
      },
    });

    return response.generated_text;
  }

  async *streamResponse(prompt: string): AsyncGenerator<string> {
    const stream = await this.hf.textGenerationStream({
      model: this.model,
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
        return_full_text: false,
      },
    });

    for await (const chunk of stream) {
      if (chunk.token?.text) {
        yield chunk.token.text;
      }
    }
  }
}
```

### 4.3 Update Environment Variables
```env
# Replace OpenAI
# OPENAI_API_KEY=sk-xxxxx  # Remove

# Add HF
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
HF_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
```

### 4.4 Cost Comparison
| Provider | Model | Cost/1K tokens | Monthly (100K req) |
|----------|-------|----------------|-------------------|
| OpenAI | GPT-4 | $0.03 | $3,000 |
| HF Pro | Llama 3.1 70B | $0.002 | $200 |
| **Savings** | - | **93%** | **$2,800/month** |

---

## Step 5: AutoTrain Setup (Future - v1.1.0)

### 5.1 Prepare Training Dataset
```python
from datasets import Dataset

# UK legal document classification
data = {
    "text": [
        "Employment termination notice...",
        "Housing lease agreement...",
        "Consumer complaint..."
    ],
    "label": ["employment", "housing", "consumer"]
}

dataset = Dataset.from_dict(data)
dataset.push_to_hub("yourusername/uk-legal-classification")
```

### 5.2 Train Model
1. Go to: https://ui.autotrain.huggingface.co
2. **Task:** Text Classification
3. **Dataset:** `yourusername/uk-legal-classification`
4. **Model:** `distilbert-base-uncased` (fast, small)
5. **Train:** ~10 minutes, $0.50

### 5.3 Use Trained Model
```typescript
const classification = await hf.textClassification({
  model: "yourusername/uk-legal-classifier",
  inputs: "This is about employment rights..."
});

console.log(classification);
// [{ label: "employment", score: 0.95 }]
```

---

## Step 6: Monitoring & Optimization

### 6.1 HF Dashboard
- Monitor usage: https://huggingface.co/settings/billing
- API rate limits: 1000 requests/hour (Pro tier)
- Space uptime: Check Space logs

### 6.2 Performance Tips
1. **Caching:** Cache frequent queries (legal definitions)
2. **Batching:** Group similar requests
3. **Model Selection:**
   - Fast queries: Mixtral 8x7B
   - Complex reasoning: Llama 3.1 70B
   - Budget: Llama 3.1 8B

### 6.3 Error Handling
```typescript
try {
  const response = await this.hf.textGeneration({...});
} catch (error) {
  if (error.message.includes("rate limit")) {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 60000));
    return this.generateResponse(prompt);
  }
  throw error;
}
```

---

## Verification Checklist

- [ ] HF Token configured in `.env`
- [ ] Inference API test successful
- [ ] Private Space created and deployed
- [ ] Test dataset uploaded
- [ ] Migration from OpenAI complete
- [ ] Cost monitoring enabled
- [ ] Error handling implemented

---

## Next Steps

1. **Day 0 Complete:** HF Pro fully integrated
2. **Day 1:** Start GDPR implementation with HF-powered AI
3. **Day 4:** Complete OpenAI → HF migration
4. **Week 4:** Launch with HF Inference API

---

## Support

- HF Docs: https://huggingface.co/docs
- Inference API: https://huggingface.co/docs/api-inference
- Spaces: https://huggingface.co/docs/hub/spaces
- AutoTrain: https://huggingface.co/docs/autotrain

**Cost:** $9/month HF Pro subscription
**ROI:** $2,800+/month savings vs OpenAI
