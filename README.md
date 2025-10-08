# Justice Companion

[![CI](https://github.com/[YOUR-USERNAME]/Justice-Companion/workflows/CI/badge.svg)](https://github.com/[YOUR-USERNAME]/Justice-Companion/actions/workflows/ci.yml)
[![Dev Quality Agents](https://github.com/[YOUR-USERNAME]/Justice-Companion/workflows/Dev%20Quality%20Agents/badge.svg)](https://github.com/[YOUR-USERNAME]/Justice-Companion/actions/workflows/dev-quality-agents.yml)
[![CodeQL](https://github.com/[YOUR-USERNAME]/Justice-Companion/workflows/CodeQL%20Security%20Scanning/badge.svg)](https://github.com/[YOUR-USERNAME]/Justice-Companion/actions/workflows/codeql.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**Your Local Legal Case Management Assistant**

Justice Companion is a privacy-first, desktop application for managing legal cases, evidence, documents, and AI-powered legal research. All data is stored locally on your device with enterprise-grade encryption.

## ✨ Features

### 🔐 Security & Privacy
- **Local-Only Storage**: All data stored in SQLite on your device (no cloud, no server)
- **AES-256-GCM Encryption**: Enterprise-grade encryption for sensitive data
- **OWASP-Compliant Authentication**: Scrypt password hashing with random salts
- **GDPR Compliant**: Data portability, right to erasure, consent management
- **Immutable Audit Logs**: SHA-256 hash-chained audit trail

### 📁 Case Management
- Create and organize legal cases by type (employment, housing, consumer, family, debt)
- Track case status (active, pending, closed)
- Attach evidence and documents
- Timeline of events and key dates
- Quick-reference facts for faster access

### 🤖 AI Legal Assistant
- AI-powered legal research (UK legal APIs integration)
- Natural language chat interface
- RAG (Retrieval-Augmented Generation) for accurate legal information
- Source citations from legislation.gov.uk and caselaw.nationalarchives.gov.uk
- Streaming responses with real-time thinking process
- **Disclaimer enforcement**: "This is information, not legal advice"

### 📝 Evidence & Documents
- Upload and organize evidence (documents, images, PDFs)
- Text extraction from PDFs and DOCX files
- Evidence categorization by type
- Secure storage with encryption
- Export capabilities

### 📊 Advanced Features
- Full-text search across cases, evidence, and notes
- Database migrations with rollback support
- Automatic backups before migrations
- GDPR data export (JSON format)
- User profile management
- Dark theme UI with glassmorphism design

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (optional, for cloning)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/[YOUR-USERNAME]/Justice-Companion.git
   cd Justice-Companion
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up encryption key**

   Create a `.env` file in the root directory:

   ```bash
   # Generate a random 32-byte encryption key
   # On Linux/macOS:
   openssl rand -base64 32

   # On Windows (PowerShell):
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```

   Add to `.env`:

   ```env
   ENCRYPTION_KEY_BASE64=your-generated-key-here
   ```

4. **Run database migrations**

   ```bash
   npm run db:migrate
   ```

5. **Start the application**

   ```bash
   npm run electron:dev
   ```

## 📖 Usage

### First Time Setup

1. **Register an account**
   - Enter username, email, and strong password (12+ characters)
   - Real-time password strength indicator

2. **Grant required consents**
   - Data processing (required)
   - Encryption (recommended)
   - AI processing (optional)
   - Marketing communications (optional)

3. **Start managing cases**
   - Create your first case
   - Add evidence and notes
   - Chat with the AI assistant

### Common Tasks

- **Create a case**: Dashboard → New Case
- **Add evidence**: Case Detail → Evidence → Add Evidence
- **Chat with AI**: Sidebar → Chat (select a case for context)
- **Export data**: Settings → GDPR → Export All Data
- **Change password**: Settings → User Profile → Change Password
- **Backup database**: `npm run db:backup`

## 🛠️ Development

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Electron, Node.js
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI API, UK Legal APIs
- **Testing**: Vitest, Playwright
- **CI/CD**: GitHub Actions

### Available Scripts

```bash
# Development
npm run dev                  # Start Vite dev server
npm run electron:dev         # Start Electron with dev server

# Building
npm run build                # Build for all platforms
npm run build:win            # Build for Windows
npm run build:mac            # Build for macOS
npm run build:linux          # Build for Linux

# Testing
npm test                     # Run unit tests
npm run test:coverage        # Run tests with coverage
npm run test:e2e             # Run E2E tests

# Code Quality
npm run lint                 # Run ESLint
npm run lint:fix             # Auto-fix linting issues
npm run type-check           # TypeScript type checking
npm run format               # Format code with Prettier

# Database
npm run db:migrate           # Run pending migrations
npm run db:migrate:status    # Check migration status
npm run db:migrate:rollback  # Rollback last migration
npm run db:backup            # Create database backup
npm run db:backup:list       # List all backups
```

### Project Structure

```
justice-companion/
├── electron/               # Electron main process
│   ├── main.ts            # Main entry point
│   ├── preload.ts         # Preload script (IPC bridge)
│   └── dev-api-server.ts  # Development API server
├── src/
│   ├── components/        # React components
│   │   ├── auth/          # Authentication UI
│   │   └── ui/            # Reusable UI components
│   ├── contexts/          # React contexts (Auth, Debug)
│   ├── db/               # Database layer
│   │   ├── migrations/    # SQL migration files
│   │   ├── database.ts    # Database manager
│   │   └── migrate.ts     # Migration runner
│   ├── features/         # Feature modules
│   │   ├── cases/        # Case management
│   │   ├── chat/         # AI chat
│   │   ├── dashboard/    # Dashboard
│   │   └── settings/     # Settings
│   ├── models/           # TypeScript types
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic layer
│   │   ├── AuthenticationService.ts
│   │   ├── EncryptionService.ts
│   │   └── AuditLogger.ts
│   ├── middleware/       # Authorization middleware
│   └── types/           # TypeScript type definitions
├── .github/
│   ├── workflows/        # GitHub Actions CI/CD
│   └── ISSUE_TEMPLATE/   # Issue templates
└── docs/                # Documentation

Total: ~50,000 lines of code
```

## 🔒 Security

### Reporting Vulnerabilities

Please see [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities responsibly.

### Security Features

- **Password Hashing**: scrypt with 128-bit random salts
- **Session Management**: 24-hour expiration, UUID v4 session IDs
- **Encryption**: AES-256-GCM for sensitive data
- **Audit Logging**: Immutable trail with hash chaining
- **Input Validation**: All user inputs validated and sanitized
- **Code Scanning**: Automated CodeQL security analysis
- **Dependency Updates**: Automated Dependabot updates

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **UK Legal APIs**: [legislation.gov.uk](https://www.legislation.gov.uk/) and [caselaw.nationalarchives.gov.uk](https://caselaw.nationalarchives.gov.uk/)
- **OpenAI**: AI-powered legal research
- **Electron**: Cross-platform desktop framework
- **Community contributors**

## 📞 Support

- **Documentation**: See [docs/](docs/) folder
- **Issues**: [GitHub Issues](https://github.com/[YOUR-USERNAME]/Justice-Companion/issues)
- **Discussions**: [GitHub Discussions](https://github.com/[YOUR-USERNAME]/Justice-Companion/discussions)

---

**Made with ❤️ for access to justice**

*Note: Justice Companion provides legal information, not legal advice. Always consult a qualified solicitor for legal advice specific to your situation.*
