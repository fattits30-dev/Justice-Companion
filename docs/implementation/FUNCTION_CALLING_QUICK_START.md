# AI Function Calling - Quick Start Guide

## Overview
The AI can now call functions to store and retrieve case facts, enabling persistent memory across conversations.

---

## How It Works

### 1. Function Calling is Automatic
When you chat about a specific case (with a caseId), the AI automatically:
- Loads stored facts before responding
- Stores new facts as you provide information
- References stored facts in its responses

### 2. Two Main Functions

**`store_case_fact`**: Store information about a case
```javascript
// AI calls this automatically when you mention facts
[[call: store_case_fact({
  caseId: 42,
  factType: "timeline",
  factKey: "dismissal_date",
  factValue: "2024-01-15",
  confidence: 1.0
})]]
```

**`get_case_facts`**: Load stored facts for context
```javascript
// AI calls this before answering case-specific questions
[[call: get_case_facts({caseId: 42})]]
```

---

## Fact Categories

The AI organizes facts into categories:

| Category | Use Case | Example |
|----------|----------|---------|
| `timeline` | Dates and events | "dismissal_date: 2024-01-15" |
| `evidence` | Evidence items | "contract: Signed employment contract from 2022" |
| `witness` | Witness information | "witness_1_name: John Smith, HR Manager" |
| `location` | Locations | "incident_location: Main office, London" |
| `communication` | Communications | "dismissal_email: Email from HR dated 2024-01-15" |
| `other` | Miscellaneous facts | "employment_duration: 3 years" |

---

## Importance Mapping

AI uses confidence scores that map to importance:

| Confidence | Importance | Use Case |
|------------|------------|----------|
| ≥ 0.9 | Critical | Confirmed facts crucial to case |
| ≥ 0.7 | High | Important facts with strong evidence |
| ≥ 0.5 | Medium | Relevant facts, moderately certain |
| < 0.5 | Low | Uncertain or peripheral facts |

---

## Example Conversation

**User**: "Create a case for unfair dismissal. I worked at ABC Tech for 3 years and was dismissed on January 15, 2024."

**AI Actions** (automatic):
```javascript
// 1. Create case
[[call: create_case({title: "Unfair Dismissal - ABC Tech", caseType: "employment"})]]
// Result: {id: 42, ...}

// 2. Store employer name
[[call: store_case_fact({
  caseId: 42,
  factType: "witness",
  factKey: "employer_name",
  factValue: "ABC Tech",
  confidence: 1.0
})]]

// 3. Store employment duration
[[call: store_case_fact({
  caseId: 42,
  factType: "timeline",
  factKey: "employment_duration",
  factValue: "3 years",
  confidence: 1.0
})]]

// 4. Store dismissal date
[[call: store_case_fact({
  caseId: 42,
  factType: "timeline",
  factKey: "dismissal_date",
  factValue: "2024-01-15",
  confidence: 1.0
})]]
```

**AI Response**: "I've created Case #42 for your unfair dismissal claim against ABC Tech. I've noted:
- Employer: ABC Tech
- Employment duration: 3 years
- Dismissal date: January 15, 2024

To help you further, I need a few more details..."

---

**Later in the conversation...**

**User**: "What do you remember about my case?"

**AI Actions**:
```javascript
// Load facts from memory
[[call: get_case_facts({caseId: 42})]]
// Result: {facts: [{factContent: "employer_name: ABC Tech", ...}, ...], count: 3}
```

**AI Response**: "Based on my stored facts for Case #42:
- Your employer was ABC Tech
- You worked there for 3 years
- You were dismissed on January 15, 2024

Would you like to add more details about the circumstances of your dismissal?"

---

## UI Indicators

When the AI calls functions, you'll see progress updates:

```
✍️ Writing...
🔧 Executing: store_case_fact
🔧 Executing: get_case_facts
✅ Complete
```

These appear in the chat interface's progress indicator.

---

## Technical Details

### Routing Logic
```typescript
// main.ts decides which streaming method to use
const useFunctionCalling = !!request.caseId;

if (useFunctionCalling) {
  // Enable function calling for case conversations
  aiServiceFactory.streamChatWithFunctions(request, caseId, ...);
} else {
  // Regular streaming for general questions
  aiServiceFactory.streamChat(request, ...);
}
```

### System Prompt Rules

The AI follows these hard-coded rules:

**RULE 1**: When <3 facts are stored, enter FACT-GATHERING MODE
- Ask for: party names, key dates, event sequence, evidence

**RULE 2**: Store facts immediately as user provides them
- Extract facts from natural language
- Call `store_case_fact` with proper categories

**RULE 3**: Load facts before every case response
- Call `get_case_facts` to refresh memory
- Reference stored facts to show continuity

---

## Debugging

### Check if Function Calling is Enabled
Look for this in console logs:
```
[DEBUG] Using function calling: true
[DEBUG] Case ID: 42
```

### Monitor Function Calls
```
[IntegratedAIService] Function called: store_case_fact {caseId: 42, ...}
[IntegratedAIService] Function called: get_case_facts {caseId: 42}
```

### Verify Facts are Stored
```javascript
// In renderer console
const facts = await window.justiceAPI.getFacts(42);
console.log('Stored facts:', facts);
```

---

## Current Status

✅ **Working**:
- System prompt with fact-gathering rules
- Function definitions for store/get facts
- Streaming with function calling
- Routing based on caseId
- UI progress indicators

🔄 **In Progress**:
- IPC integration in function handlers (currently returns mock data)
- Real database storage/retrieval

---

## Testing

### Basic Test
1. Create a case: "Create a case for unfair dismissal at ABC Tech"
2. Check console for: `[IntegratedAIService] Function called: store_case_fact`
3. Ask: "What do you remember?"
4. Check console for: `[IntegratedAIService] Function called: get_case_facts`

### Verify Storage
```javascript
// In renderer DevTools console
const facts = await window.justiceAPI.getFacts(42);
console.log('Stored facts:', facts.data);
```

---

**Last Updated**: 2025-10-05
**Status**: Beta (function calling works, IPC integration pending)
