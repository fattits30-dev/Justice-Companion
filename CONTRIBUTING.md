# Contributing to Justice Companion

Thank you for your interest in contributing! This document outlines the development workflow and CI expectations.

## Development Setup

### Desktop (Windows/macOS/Linux)

```bash
# Clone the repository
git clone https://github.com/fattits30-dev/Justice-Companion.git
cd Justice-Companion

# Install dependencies
flutter pub get

# Start development server (Flutter)
./scripts/dev.sh frontend
```

### Android/Termux

See [DEV_ON_ANDROID.md](./DEV_ON_ANDROID.md) for detailed Termux setup instructions.

Quick start:
```bash
pkg install git python3
git clone https://github.com/fattits30-dev/Justice-Companion.git
cd Justice-Companion
flutter pub get
./scripts/dev.sh frontend
```

## Development Scripts

| Script | Purpose |
|--------|---------|
| `./scripts/dev.sh [frontend\|backend\|full]` | Start dev server |
| `./scripts/test.sh [frontend\|backend\|all]` | Run tests |
| `./scripts/lint.sh [all\|fix]` | Run linters |
| `./scripts/build.sh [web\|apk\|appbundle\|ios\|macos\|linux\|windows]` | Build for production |

## Code Quality Standards

Before submitting a PR, ensure:

1. **Linting passes**: `./scripts/lint.sh`
2. **Tests pass**: `./scripts/test.sh frontend`
3. **Build succeeds**: `./scripts/build.sh web`

## CI Pipeline

Every PR triggers the following checks:

- **Lint**: flutter analyze
- **Unit Tests**: flutter test
- **Build**: flutter build web

Push to `main` also runs cross-platform builds (Ubuntu, Windows, macOS).

### CI Expectations

| Check | Required | Notes |
|-------|----------|-------|
| Lint | Yes | Must pass |
| Unit Tests | Yes | Must pass |
| Build | Yes | Must produce build/web |

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
├── lib/                 # Flutter source
├── backend/             # Python FastAPI backend
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   └── tests/           # Backend tests
├── scripts/             # Cross-platform dev scripts
├── .github/workflows/   # CI/CD pipelines
└── build/               # Flutter build output (gitignored)
```

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- For questions, use GitHub Discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
