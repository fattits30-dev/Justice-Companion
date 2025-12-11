# Streaming Bug Fix: `.value` Error

## Problem

Error: `'str' object has no attribute 'value'` during chat streaming.

## Root Cause

The issue is in how provider comparisons are done in `backend/services/ai/sdk.py`.

**Current code** (lines 717-727, 545-547):
```python
if self.config.provider == AIProviderType.ANTHROPIC:
    # Anthropic streaming
elif self.config.provider in {AIProviderType.QWEN, AIProviderType.HUGGINGFACE}:
    # HuggingFace streaming
```

**Problem**: When `self.config.provider` gets passed around, there's inconsistency in whether it's an Enum or string, causing comparison failures.

## The Fix

**Change provider comparisons to use string values:**

### File: `backend/services/ai/sdk.py`

#### Fix 1: Line ~545 (non-streaming chat)
```python
# BEFORE
if self.config.provider == AIProviderType.ANTHROPIC:

# AFTER
provider_str = str(self.config.provider.value if hasattr(self.config.provider, 'value') else self.config.provider)
if provider_str == "anthropic":
```

#### Fix 2: Line ~717 (streaming chat)
```python
# BEFORE
if self.config.provider == AIProviderType.ANTHROPIC:
elif self.config.provider in {AIProviderType.QWEN, AIProviderType.HUGGINGFACE}:

# AFTER
provider_str = str(self.config.provider.value if hasattr(self.config.provider, 'value') else self.config.provider)
if provider_str == "anthropic":
elif provider_str in {"qwen", "huggingface"}:
```

## Alternative Fix (Better)

**Use the existing `_provider_str` helper method:**

```python
# At the start of stream_chat() method (line ~712)
provider_str = self._provider_str(self.config.provider)

# Then use string comparisons:
if provider_str == "anthropic":
    # Anthropic streaming
elif provider_str in {"qwen", "huggingface"}:
    # HuggingFace streaming
else:
    # OpenAI-compatible
```

And same for the `chat()` method around line ~543.

## Test

After applying fix:

1. Start backend: `npm run dev:backend`
2. Send a chat message from frontend
3. Verify streaming works without `.value` error

