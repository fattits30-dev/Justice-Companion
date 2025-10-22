# Contributing to Justice Companion

Thank you for considering contributing to Justice Companion! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, constructive, and professional in all interactions.

### Our Standards

**Examples of encouraged behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Violations may be reported to the project maintainers at conduct@justicecompanion.app. All reports will be reviewed and investigated confidentially.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 20.18.0 LTS** (NOT Node 22.x) - Electron 38.2.1 requires Node 20.x
- **pnpm** package manager (NOT npm or yarn)
- **Git** for version control
- **Windows 11**, **macOS**, or **Linux** (Ubuntu/Debian recommended)

### Recommended Tools

- **Visual Studio Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Playwright Test for VS Code
- **nvm** or **fnm** for Node.js version management

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/justice-companion.git
cd justice-companion
```

### 2. Install Dependencies

```bash
# Ensure Node 20.x is active
nvm use 20  # or: fnm use 20

# Install dependencies (MUST use pnpm)
pnpm install
```

The `postinstall` script automatically rebuilds `better-sqlite3` for Electron.

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# For development/testing only
# Production uses OS-level key storage (DPAPI/Keychain/libsecret)
ENCRYPTION_KEY_BASE64=<your-32-byte-base64-encoded-key>
```

Generate an encryption key:

```bash
# Linux/macOS:
openssl rand -base64 32

# Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Important**: Never commit `.env` to version control. This file is already in `.gitignore`.

### 4. Run Database Migrations

```bash
pnpm db:migrate
```

### 5. Start Development Server

```bash
# Option 1: Full Electron app with dev server
pnpm electron:dev

# Option 2: Vite dev server only (for UI development)
pnpm dev
```

### 6. Verify Setup

```bash
# Run tests to verify everything works
pnpm test

# Run linter
pnpm lint

# Type-check TypeScript
pnpm type-check
```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled**: All code must pass `typescript` strict checks
- **No `any` types**: Use proper TypeScript types or `unknown` with type guards
- **Explicit return types**: For public functions and class methods
- **Interfaces over types**: Prefer `interface` for object shapes

```typescript
// ✅ Good
interface User {
  id: number;
  email: string;
}

function getUser(id: number): User | null {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

### Import Extensions (CRITICAL)

**All relative imports MUST have explicit `.ts` or `.tsx` extensions:**

```typescript
// ✅ Correct
import { UserRepository } from '../repositories/UserRepository.ts';
import { LoginScreen } from './LoginScreen.tsx';
import type { User } from '../models/User.ts';

// ❌ Wrong - will fail with TSX transpiler
import { UserRepository } from '../repositories/UserRepository';
import { LoginScreen } from './LoginScreen';
```

**Why**: Justice Companion uses `tsx` for development, which requires explicit file extensions for ESM module resolution.

**Quick fix**: Run `node fix-imports-simple.mjs` to automatically add `.ts` extensions.

### ESLint and Prettier

All code must pass ESLint and Prettier checks:

```bash
# Auto-fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting without changes
pnpm format:check
```

**ESLint rules**:
- No unused variables
- No console.log in production code (use proper logging)
- Consistent spacing and indentation (2 spaces)
- Import order: React → third-party → local

### React Best Practices

- **Functional components**: Use hooks, not class components
- **TypeScript props**: Always type props interfaces
- **Accessibility**: Follow WCAG 2.1 AA standards
- **Performance**: Use `React.memo`, `useMemo`, `useCallback` appropriately

```typescript
// ✅ Good
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary' }) => {
  return (
    <button onClick={onClick} className={`btn-${variant}`}>
      {children}
    </button>
  );
};

// ❌ Bad (missing types)
export const Button = ({ onClick, children, variant }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

### File and Folder Naming

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Services/Repositories**: PascalCase (e.g., `AuthenticationService.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Test files**: Match source file with `.test.ts` suffix (e.g., `UserRepository.test.ts`)

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic change)
- `refactor`: Code restructuring (no feature/fix)
- `test`: Adding or updating tests
- `chore`: Maintenance (dependencies, build config)
- `perf`: Performance improvement
- `security`: Security fix

### Examples

```
feat(auth): add OAuth2 authentication support

Implements OAuth2 flow with support for Google and Microsoft providers.
Includes session management and token refresh logic.

Closes #123

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
fix(database): resolve encryption key migration issue

Fixes crash when migrating from .env to OS-level key storage.
Added validation for base64-encoded keys.

Fixes #456
```

```
docs(readme): update installation instructions

Added troubleshooting section for Node.js version mismatch.
```

### Co-Authorship

If Claude Code assisted with your contribution, include:

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Pull Request Process

### Before Submitting

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. **Run quality gates**:
   ```bash
   pnpm lint && pnpm type-check && pnpm test
   ```

3. **Update documentation** if needed (README.md, CLAUDE.md, inline comments)

4. **Test manually** in Electron app:
   ```bash
   pnpm electron:dev
   ```

### PR Title

Use Conventional Commits format:
- `feat(scope): add new feature`
- `fix(scope): resolve bug`
- `docs: update contributing guide`

### PR Description Template

```markdown
## Summary
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123
Relates to #456

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manually tested in Electron app

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No new ESLint warnings
- [ ] TypeScript type-check passes

## Screenshots (if applicable)
[Add screenshots for UI changes]
```

### Review Process

1. **Automated checks**: CI runs lint, type-check, and tests
2. **Code review**: At least 1 maintainer approval required
3. **Testing**: Reviewer tests changes locally
4. **Merge**: Squash and merge to `main`

### After Merge

- Delete your feature branch
- Update your fork:
  ```bash
  git checkout main
  git pull upstream main
  ```

## Testing Requirements

### Unit Tests

- **Required for**: Services, repositories, utilities
- **Framework**: Vitest
- **Coverage target**: 80%+ for new code
- **Location**: Same directory as source file with `.test.ts` suffix

```typescript
// src/services/AuthenticationService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthenticationService } from './AuthenticationService.ts';

describe('AuthenticationService', () => {
  let authService: AuthenticationService;

  beforeEach(() => {
    authService = new AuthenticationService();
  });

  it('should hash passwords with scrypt', async () => {
    const password = 'SecureP@ssw0rd';
    const hash = await authService.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(64);
  });
});
```

### E2E Tests

- **Required for**: User flows, critical paths
- **Framework**: Playwright
- **Location**: `tests/e2e/`

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in successfully', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');

  await expect(page).toHaveURL('/dashboard');
});
```

### Running Tests

```bash
# Run all unit tests
pnpm test

# Run specific test file
pnpm test src/services/AuthenticationService.test.ts

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E tests in UI mode
pnpm test:e2e:ui
```

### Test Database

Tests use in-memory SQLite databases:

```typescript
import { DatabaseTestHelper } from '../test-utils/database-test-helper.ts';

describe('UserRepository', () => {
  let testHelper: DatabaseTestHelper;

  beforeEach(() => {
    testHelper = new DatabaseTestHelper();
  });

  afterEach(() => {
    testHelper.cleanup();
  });
});
```

## Documentation

### When to Update Documentation

Update documentation when you:
- Add new features or commands
- Change API signatures
- Modify configuration options
- Fix bugs that affect usage
- Add new dependencies

### Documentation Files

- **README.md**: Project overview, quick start
- **CLAUDE.md**: AI assistant guidance, architecture
- **SECURITY.md**: Security policy, vulnerability reporting
- **CONTRIBUTING.md**: This file
- **docs/**: Detailed guides and API documentation

### Inline Code Documentation

```typescript
/**
 * Encrypts sensitive data using AES-256-GCM.
 *
 * @param plaintext - The data to encrypt
 * @param key - The encryption key (32 bytes, base64-encoded)
 * @returns Encrypted data with IV prepended
 * @throws {Error} If encryption fails
 *
 * @example
 * const encrypted = await encryptData('sensitive', encryptionKey);
 */
async function encryptData(plaintext: string, key: string): Promise<string> {
  // Implementation
}
```

## Community

### Getting Help

- **GitHub Discussions**: For questions and feature requests
- **GitHub Issues**: For bug reports (use template)
- **Email**: support@justicecompanion.app

### Communication Guidelines

- **Be respectful**: Treat everyone with respect
- **Be constructive**: Provide actionable feedback
- **Be patient**: Maintainers are volunteers
- **Be clear**: Provide context, steps to reproduce, expected vs. actual behavior

### Issue Reporting

Use GitHub issue templates:

**Bug Report:**
- Description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, Electron version)
- Screenshots/logs

**Feature Request:**
- Problem statement
- Proposed solution
- Alternatives considered
- Additional context

## License

By contributing to Justice Companion, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

## Acknowledgments

We appreciate all contributions, big or small. Contributors are recognized in:
- Release notes
- CHANGELOG.md
- GitHub Contributors page

Thank you for contributing to Justice Companion!

---

**Last updated**: 2025-10-21
**Version**: 1.0.0
