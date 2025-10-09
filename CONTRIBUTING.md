# Contributing to Justice Companion

Thank you for your interest in contributing to Justice Companion! This document provides guidelines and instructions for setting up your development environment and contributing to the project.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Testing Guidelines](#testing-guidelines)
6. [Code Style](#code-style)
7. [Commit Guidelines](#commit-guidelines)
8. [Pull Request Process](#pull-request-process)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/justice-companion.git
cd justice-companion

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your encryption key

# 4. Run database migrations
npm run db:migrate

# 5. Start development server
npm run dev

# 6. In another terminal, start Electron
npm run electron:dev
```

---

## Development Environment Setup

### Prerequisites

- **Node.js**: >= 22.x (Current: v22.20.0)
- **npm**: >= 10.x
- **Git**: Latest version
- **IDE**: VS Code or Cursor (recommended)

### Recommended VS Code/Cursor Extensions

The project includes `.vscode/extensions.json` with recommended extensions:

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **TODO Tree** - Task tracking in code
- **GitLens** - Advanced Git integration
- **Error Lens** - Inline error display
- **Code Spell Checker** - Spelling checker

### First-Time Setup

1. **Install Extensions**: Open Command Palette (`Ctrl+Shift+P`) → "Extensions: Show Recommended Extensions"
2. **Install Dependencies**: `npm install`
3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Generate a 32-byte encryption key:
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   # Paste the key into .env as ENCRYPTION_KEY_BASE64
   ```
4. **Run Migrations**: `npm run db:migrate`
5. **Verify Setup**: `npm test`

---

## Project Structure

```
justice-companion/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── features/           # Feature modules (cases, evidence, AI, etc.)
│   ├── services/           # Business logic (encryption, audit, AI)
│   ├── repositories/       # Data access layer
│   ├── db/                 # Database & migrations
│   ├── models/             # TypeScript types
│   └── contexts/           # React contexts (Auth, Theme, etc.)
├── electron/               # Electron main process
├── tests/                  # E2E tests (Playwright)
├── docs/                   # Documentation
│   ├── guides/             # Developer guides
│   ├── api/                # API documentation
│   ├── reports/            # Audit reports
│   └── implementation/     # Feature implementation docs
└── .github/                # GitHub Actions & templates
```

---

## Development Workflow

### 1. Create a Branch

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Or bug fix branch
git checkout -b fix/bug-description
```

### 2. Make Changes

- Follow [Code Style Guidelines](#code-style)
- Write tests for new features
- Update documentation as needed

### 3. Run Quality Checks

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Run tests
npm test

# Run all checks
npm run guard
```

### 4. Commit Changes

Follow [Commit Guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add new feature description"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
# Then create PR on GitHub
```

---

## Testing Guidelines

### Test Types

1. **Unit Tests**: Test individual functions/components
   - Location: Co-located with source files (`*.test.ts`, `*.test.tsx`)
   - Run: `npm test`

2. **Integration Tests**: Test multiple modules together
   - Example: Repository + Service + IPC handler
   - Run: `npm test -- --grep "integration"`

3. **E2E Tests**: Test complete user workflows
   - Location: `tests/e2e/`
   - Run: `npm run test:e2e`

### Writing Tests

**Example Unit Test**:

```typescript
describe('EncryptionService', () => {
  it('should encrypt and decrypt data', () => {
    const service = new EncryptionService();
    const plaintext = 'sensitive data';

    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });
});
```

**Example Component Test**:

```typescript
describe('CaseCard', () => {
  it('should render case title', () => {
    render(<CaseCard case={mockCase} />);
    expect(screen.getByText(mockCase.title)).toBeInTheDocument();
  });
});
```

### Test Coverage

- **Target**: 80%+ code coverage
- **Current**: ~60%
- Run coverage report: `npm run test:coverage`

---

## Code Style

### TypeScript

- Use strict type checking (no `any` types)
- Explicit return types for functions
- Prefer interfaces over types for objects

```typescript
// ✅ Good
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User | null {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Components**: `PascalCase.tsx`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`

### Imports

```typescript
// ✅ Good - Organized groups
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { UserService } from '@/services/UserService';
import type { User } from '@/models/User';

// ❌ Bad - Random order
import type { User } from '@/models/User';
import { useState } from 'react';
import { UserService } from '@/services/UserService';
```

### Comments

- Use JSDoc for public APIs
- Inline comments for complex logic
- Explain "why" not "what"

```typescript
/**
 * Encrypts sensitive data using AES-256-GCM
 *
 * @param plaintext - The data to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string): EncryptedData {
  // Use random IV for each encryption to prevent pattern analysis
  const iv = crypto.randomBytes(16);
  // ...
}
```

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)
- `perf`: Performance improvements
- `security`: Security fixes

### Examples

```bash
# Feature
git commit -m "feat(auth): add password reset functionality"

# Bug fix
git commit -m "fix(encryption): resolve key rotation issue"

# Documentation
git commit -m "docs(api): update IPC handler documentation"

# Multiple lines
git commit -m "feat(ai): integrate RAG for legal citations

- Add RAGService with legislation.gov.uk integration
- Add LegalAPIService for case law lookup
- Update AI chat to include citations in responses

Closes #123"
```

---

## Pull Request Process

### Before Creating PR

1. ✅ All tests pass (`npm test`)
2. ✅ Type check passes (`npm run type-check`)
3. ✅ Linting passes (`npm run lint`)
4. ✅ Code is formatted (`npm run format`)
5. ✅ Branch is up to date with `main`

### PR Title Format

Same as commit message format:

```
feat(scope): description
fix(scope): description
docs(scope): description
```

### PR Description

The PR template will guide you through:

- **Description**: What changed and why
- **Type of Change**: Feature, bug fix, docs, etc.
- **Related Issues**: Link to GitHub issues
- **Changes Made**: Bullet point list
- **Testing**: How you tested the changes
- **Screenshots**: If UI changes

### Review Process

1. **Automated Checks**: GitHub Actions run tests, lint, type-check
2. **Code Review**: Maintainer reviews code quality and functionality
3. **Approval**: PR approved and merged

---

## Additional Resources

- **Build Guide**: [docs/guides/MASTER_BUILD_GUIDE.md](docs/guides/MASTER_BUILD_GUIDE.md)
- **Quick Reference**: [docs/guides/BUILD_QUICK_REFERENCE.md](docs/guides/BUILD_QUICK_REFERENCE.md)
- **API Documentation**: [docs/api/IPC_API_REFERENCE.md](docs/api/IPC_API_REFERENCE.md)
- **TODO List**: [TODO.md](TODO.md)

---

## Questions?

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community help
- **Documentation**: Check `docs/` directory first

---

## License

By contributing to Justice Companion, you agree that your contributions will be licensed under the MIT License.
