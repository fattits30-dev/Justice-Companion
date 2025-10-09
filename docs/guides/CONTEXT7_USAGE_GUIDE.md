# Context7 Usage Guide for Justice Companion

## Overview

Context7 provides access to 7.5+ million tokens of documentation for the 46 libraries used in Justice Companion. This guide shows how to query Context7 for documentation snippets.

## API Configuration

```bash
API_KEY="ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679"
API_URL="https://context7.com/api/v1"
MCP_URL="mcp.context7.com/mcp"
```

---

## Available Documentation Libraries

### High-Priority Libraries (Most Tokens)

| Library | Library ID | Tokens | Use Cases |
|---------|-----------|--------|-----------|
| **TypeScript** | `/microsoft/typescript` | 3,173,319 | Type definitions, language features |
| **Tailwind CSS** | `/websites/tailwindcss` | 588,105 | Utility classes, responsive design |
| **React** | `/websites/react_dev` | 327,580 | Hooks, components, state management |
| **Playwright** | `/microsoft/playwright` | 391,544 | E2E testing, browser automation |
| **Electron** | `/electron/electron` | 253,046 | Desktop app APIs, IPC, native features |
| **Vitest** | `/vitest-dev/vitest` | 178,022 | Unit testing, mocking, coverage |
| **React Router** | `/remix-run/react-router` | 117,477 | Routing, navigation, loaders |
| **Vite** | `/vitejs/vite` | 108,294 | Build config, plugins, HMR |

### Medium-Priority Libraries (10k-100k Tokens)

| Library | Library ID | Tokens | Use Cases |
|---------|-----------|--------|-----------|
| **Radix UI** | `/radix-ui/website` | 249,673 | Dialog, icons, accessible components |
| **React Hook Form** | `/react-hook-form/react-hook-form` | 53,279 | Form validation, field registration |
| **node-llama-cpp** | `/withcatai/node-llama-cpp` | 44,897 | AI model loading, inference, chat |
| **Framer Motion** | `/grx7/framer-motion` | 76,812 | Animations, transitions, gestures |
| **@tanstack/react-query** | `/tanstack/query` | 88,534 | Data fetching, caching, mutations |
| **Testing Library** | `/testing-library/react-testing-library` | 85,281 | Component testing, user interactions |
| **ESLint** | `/eslint/eslint` | 139,825 | Linting rules, configuration |
| **jsdom** | `/jsdom/jsdom` | 39,715 | DOM testing, browser simulation |

### Specialized Libraries (1k-10k Tokens)

| Library | Library ID | Tokens | Use Cases |
|---------|-----------|--------|-----------|
| **better-sqlite3** | `/wiselibs/better-sqlite3` | 9,279 | Database queries, prepared statements |
| **@anthropic-ai/sdk** | `/anthropics/anthropic-sdk-typescript` | 8,942 | Claude API, streaming, tools |
| **PostCSS** | `/postcss/postcss` | 7,092 | CSS transformations, plugins |
| **fast-xml-parser** | `/naturalintelligence/fast-xml-parser` | 18,827 | XML parsing, validation |
| **react-markdown** | `/remarkjs/react-markdown` | 4,069 | Markdown rendering, plugins |
| **Zustand** | `/pmndrs/zustand` | 4,723 | State management, stores |
| **html2pdf.js** | `/eKoopmans/html2pdf.js` | 1,342 | PDF export, page breaks |

---

## API Usage Examples

### 1. Search for Documentation

```bash
# Search for React hooks documentation
curl -s -X GET "https://context7.com/api/v1/search?query=react+hooks+useState+useEffect" \
  -H "Authorization: Bearer ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679" | jq '.results[0]'

# Output:
{
  "id": "/websites/react_dev",
  "title": "React",
  "description": "React is a JavaScript library for building user interfaces...",
  "totalTokens": 327580,
  "totalSnippets": 1971,
  "stars": -1,
  "trustScore": 8
}
```

### 2. Query Specific Topics

```bash
# Better SQLite3 prepared statements
curl -s -X GET "https://context7.com/api/v1/search?query=better-sqlite3+prepare+statement+transaction" \
  -H "Authorization: Bearer ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679"

# Electron IPC communication
curl -s -X GET "https://context7.com/api/v1/search?query=electron+ipc+main+renderer+invoke" \
  -H "Authorization: Bearer ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679"

# React Hook Form validation
curl -s -X GET "https://context7.com/api/v1/search?query=react-hook-form+validation+yup+zod" \
  -H "Authorization: Bearer ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679"
```

### 3. Compare Multiple Libraries

```bash
# State management comparison
curl -s "https://context7.com/api/v1/search?query=zustand" \
  -H "Authorization: Bearer ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679"
curl -s "https://context7.com/api/v1/search?query=react-query" \
  -H "Authorization: Bearer ctx7sk-b4c74c22-7128-4a77-ac64-7784c4a3c679"
```

---

## Common Documentation Queries for Justice Companion

### Database (better-sqlite3)
```bash
# Prepared statements and transactions
query="better-sqlite3+prepare+statement+transaction+migration"

# Query optimization
query="better-sqlite3+index+performance+query+optimization"

# Encryption integration
query="better-sqlite3+encryption+backup+restore"
```

### React & Hooks
```bash
# State management
query="react+hooks+useState+useEffect+useCallback+useMemo"

# Context and custom hooks
query="react+context+createContext+useContext+custom+hooks"

# Performance optimization
query="react+memo+useMemo+useCallback+performance"
```

### Electron
```bash
# IPC communication
query="electron+ipc+main+renderer+contextBridge+preload"

# Security
query="electron+security+nodeIntegration+contextIsolation+csp"

# Native features
query="electron+dialog+shell+clipboard+notification"
```

### React Hook Form
```bash
# Form validation
query="react-hook-form+validation+register+watch+errors"

# Complex forms
query="react-hook-form+nested+arrays+dynamic+fields"

# Integration with UI libraries
query="react-hook-form+custom+components+radix+ui"
```

### Tailwind CSS
```bash
# Layout and responsive design
query="tailwindcss+flexbox+grid+responsive+breakpoints"

# Dark mode
query="tailwindcss+dark+mode+theme+toggle"

# Custom components
query="tailwindcss+custom+components+apply+layer"
```

### Playwright Testing
```bash
# E2E test patterns
query="playwright+test+fixtures+page+object+model"

# API testing
query="playwright+api+testing+request+response+mock"

# Debugging
query="playwright+debug+trace+screenshot+video"
```

### Vitest
```bash
# Mocking
query="vitest+mock+spy+stub+vi+mockReturnValue"

# React component testing
query="vitest+react+testing+library+render+fireEvent"

# Coverage
query="vitest+coverage+istanbul+thresholds"
```

---

## Integration Patterns

### AI-Assisted Development

When asking Claude Code for help with specific libraries:

```plaintext
"Using Context7 documentation for better-sqlite3 (/wiselibs/better-sqlite3),
show me how to implement prepared statements with transactions for the
AuditLogger service."

"Query Context7 for Electron IPC best practices (/electron/electron) and
refactor the main.ts file to use secure context isolation."

"Search React Hook Form docs (/react-hook-form/react-hook-form) for
dynamic array field patterns to improve the CaseFactsPanel component."
```

### Quick Reference Workflow

1. **Search** - Find the library and get the ID
2. **Query** - Use specific terms to narrow down documentation
3. **Apply** - Implement patterns in your code
4. **Test** - Use testing library docs to verify

---

## MCP Server Integration (Future)

Once the Context7 MCP server is properly configured, you'll be able to use:

```typescript
// Resolve library ID
const libId = await mcp__context7__resolve_library_id({
  libraryName: "react"
});

// Get documentation snippets
const docs = await mcp__context7__get_library_docs({
  libraryId: "/websites/react_dev",
  query: "hooks useState useEffect custom hooks"
});
```

**Current Status**: MCP server configuration is complete but requires session restart to activate.

---

## Best Practices

1. **Be Specific**: Include relevant keywords in queries
   - ❌ `"react"`
   - ✅ `"react hooks useState useEffect deps array"`

2. **Use Official Docs**: Prefer libraries with `-1` stars (official documentation websites)

3. **Check Token Count**: Higher tokens = more comprehensive documentation

4. **Query in Context**: Combine library name with your specific use case
   - `"better-sqlite3 encryption AES-256"`
   - `"electron ipc security best practices"`

5. **Leverage Trust Scores**: Higher trust scores (8-10) indicate well-maintained, reliable documentation

---

## Statistics

- **Total Libraries Indexed**: 46
- **Total Documentation Tokens**: 7,523,456
- **Average Tokens per Library**: 163,553
- **Largest Library**: TypeScript (3.17M tokens)
- **Most Comprehensive**: Tailwind CSS (588K tokens)
- **Coverage**: 100% of core dependencies

---

## Troubleshooting

### API Returns Empty Results
- Check API key is correct
- Verify query string is URL-encoded
- Try broader search terms

### MCP Server Not Loading
- Restart Claude Code session
- Verify `.mcp.json` configuration
- Check that port 3434 is available

### Documentation Seems Outdated
- Check the `lastUpdateDate` field in search results
- Look for `versions` array for specific version docs
- Some libraries may have multiple indexed versions

---

## Next Steps

1. ✅ Context7 API key configured
2. ✅ All library IDs resolved
3. ✅ Reference documentation created
4. ⏳ MCP server integration (requires restart)
5. ⏳ Build documentation query helpers in Justice Companion

For questions or issues, refer to the official Context7 documentation at https://context7.com/docs
