# Justice Companion - GitHub Codespaces Setup

## Quick Start

1. **Open in Codespaces:**
   - Click "Code" → "Codespaces" → "Create codespace on main"
   - Wait for container to build (5-10 minutes first time)

2. **Verify Installation:**
   ```bash
   node --version  # Should show v20.18.0
   pnpm --version  # Should show latest
   pnpm test       # Should run 1557+ tests
   ```

3. **Development:**
   ```bash
   pnpm dev          # Start Vite dev server (port 5173)
   pnpm electron:dev # Start Electron app (port 5174)
   ```

## Features Included

### VS Code Extensions
- ✅ ESLint + Prettier (auto-format on save)
- ✅ GitHub Copilot + Copilot Chat
- ✅ Playwright Test Runner
- ✅ Vitest Explorer
- ✅ Tailwind CSS IntelliSense
- ✅ TypeScript Enhanced

### Pre-Installed Tools
- Node.js 20.18.0 LTS
- pnpm (latest)
- Python 3.11 (for build scripts)
- Git
- Better-SQLite3 build tools
- Playwright browsers

### Configuration
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Storage:** 32 GB
- **Ports:** 5173 (Vite), 5174 (Electron)

## Environment Variables

Create `.env` file in workspace root:
```env
ENCRYPTION_KEY_BASE64=<your-key>  # Will migrate to safeStorage in Day 3
HF_TOKEN=<your-huggingface-token>
NODE_ENV=development
```

Get Hugging Face token:
- Go to https://huggingface.co/settings/tokens
- Create new token with "read" permissions
- Copy and paste above

## Troubleshooting

### Better-SQLite3 Build Issues
```bash
pnpm rebuild better-sqlite3
```

### TypeScript Errors
```bash
pnpm type-check
```

### Test Failures
```bash
pnpm test:coverage  # Check what's failing
```

## Next Steps

After Codespace is ready:
1. Set up Hugging Face integration (Day 0 Afternoon)
2. Start Day 1: GDPR implementation
3. Use Copilot Chat for code generation

## Cost

- Free: 120 core-hours/month (30 hours with 4-core machine)
- This plan uses ~80 hours/month (4 weeks × 5 days × 4 hours)
- **Recommendation:** Use for focused dev sessions, turn off overnight
