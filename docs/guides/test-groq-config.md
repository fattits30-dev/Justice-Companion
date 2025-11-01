# Testing Groq Configuration

## Step 1: Configure Groq API Key via Browser Console

Open the running Electron app (Dashboard view), press `Ctrl+Shift+I` to open DevTools, then paste this in the Console:

```javascript
// Configure Groq API key
await window.justiceAPI.configureAI({
  apiKey: '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',
  provider: 'groq',
  model: 'llama-3.3-70b-versatile'
});
```

Expected output:
```
{success: true, data: {success: true, message: 'API key saved successfully'}}
```

## Step 2: Navigate to Chat View

In the sidebar, click "Chat" or navigate to `/chat`.

## Step 3: Send Test Message

In the chat input, type:
```
What are my rights if I'm being bullied at work?
```

Press Enter or click Send.

## Expected Behavior

1. **Streaming tokens appear** - You see text being typed out in real-time
2. **Legal disclaimer appended** - Response ends with "⚖️ Legal Disclaimer: This is information, not legal advice."
3. **No errors** - Check main process logs for:
   - `[IPC] Groq API key loaded from SecureStorage`
   - `[IPC] GroqService created`
   - No error messages

## Step 4: Check Main Process Logs

In your terminal running `pnpm electron:dev`, you should see:
- `[IPC] Configuring AI provider: groq`
- `[IPC] groq API key configured successfully`
- `[IPC] GroqService reset`
- `[IPC] GroqService created (API key will be loaded from SecureStorage)`
- `[IPC] Groq API key loaded from SecureStorage`
