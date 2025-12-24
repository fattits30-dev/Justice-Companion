# Contributing to Justice Companion

Thank you for your interest in contributing! This document outlines the development workflow and CI expectations.

## Development Setup

### Desktop (Windows/macOS/Linux)

```bash
# Clone the repository
git clone https://github.com/fattits30-dev/Justice-Companion.git
cd Justice-Companion

# Install dependencies
npm ci

# Start development server
npm run dev

# Or use the scripts
./scripts/dev.sh frontend
```

### Android/Termux

See [DEV_ON_ANDROID.md](./DEV_ON_ANDROID.md) for detailed Termux setup instructions.

Quick start:
```bash
pkg install git nodejs-lts
git clone https://github.com/fattits30-dev/Justice-Companion.git
cd Justice-Companion
npm ci
./scripts/dev.sh frontend
```

## Development Scripts

All scripts auto-detect your package manager (npm/pnpm/yarn):

| Script | Purpose |
|--------|---------|
| `./scripts/dev.sh [frontend\|backend\|full]` | Start dev server |
| `./scripts/test.sh [frontend\|backend\|all]` | Run tests |
| `./scripts/lint.sh [all\|fix]` | Run linters |
| `./scripts/build.sh` | Build for production |

## Code Quality Standards

Before submitting a PR, ensure:

1. **Linting passes**: `./scripts/lint.sh`
2. **Tests pass**: `./scripts/test.sh frontend`
3. **TypeScript compiles**: `npm run typecheck`
4. **Build succeeds**: `./scripts/build.sh`

## CI Pipeline

Every PR triggers the following checks:

- **Lint & Type Check**: ESLint + TypeScript
- **Unit Tests**: Vitest
- **Build**: Production build verification

Push to `main` also runs cross-platform builds (Ubuntu, Windows, macOS).

### CI Expectations

| Check | Required | Notes |
|-------|----------|-------|
| Lint | Yes | Must pass |
| TypeScript | Yes | No type errors |
| Unit Tests | Yes | Must pass |
| Build | Yes | Must produce dist/ |
| E2E Tests | Separate workflow | May be skipped for draft PRs |

## Pull Request Process

1. Fork and create a feature branch from `main`
2. Make your changes with clear, atomic commits
3. Ensure all CI checks pass
4. Update documentation if needed
5. Submit PR with a clear description

### Commit Messages

Use conventional commits:

```
feat: add user authentication
fix: resolve date parsing issue
docs: update API documentation
refactor: simplify validation logic
test: add unit tests for parser
```

## Project Structure

```
Justice-Companion/
├── src/                 # Frontend React/TypeScript code
├── backend/             # Python FastAPI backend
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   └── tests/           # Backend tests
├── scripts/             # Cross-platform dev scripts
├── e2e/                 # Playwright e2e tests
├── .github/workflows/   # CI/CD pipelines
└── dist/                # Build output (gitignored)
```

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- For questions, use GitHub Discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
