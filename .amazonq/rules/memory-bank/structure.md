# Justice Companion - Project Structure

## Directory Organization

### `/electron`
Electron main process and preload scripts
- `main.ts` - Main Electron process, window management, IPC handlers
- `preload.ts` - Preload script for secure renderer-main communication

### `/dist-electron`
Compiled Electron code (build output)
- `main.js` - Compiled main process
- `preload.js` - Compiled preload script
- `migrations/` - Database migration SQL files

### `/src`
React application source code

#### `/src/models`
TypeScript data models and interfaces
- `Case.ts` - Case entity model
- `Evidence.ts` - Evidence entity model
- `LegalIssue.ts` - Legal issue entity model
- `TimelineEvent.ts` - Timeline event entity model
- `Note.ts` - Note entity model
- `Action.ts` - Action item entity model
- `index.ts` - Centralized model exports

#### `/src/repositories`
Data access layer
- `CaseRepository.ts` - Database operations for cases and related entities

#### `/src/services`
Business logic layer
- `AIService.ts` - AI integration and intelligent features
- `CaseService.ts` - Case management business logic

#### `/src/hooks`
React custom hooks
- `useCases.ts` - Case data management with React Query

#### `/src/db`
Database configuration and migrations
- `database.ts` - SQLite database setup
- `migrate.ts` - Migration runner
- `migrations/` - SQL migration files

#### `/src/types`
TypeScript type definitions
- `ai.ts` - AI service types
- `ipc.ts` - Inter-process communication types

#### `/src/utils`
Utility functions
- `error-logger.ts` - Error logging and tracking
- `error-logger.test.ts` - Error logger tests

### Root Configuration Files
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `vitest.config.ts` - Vitest test configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `.prettierrc.json` - Code formatting rules

### `/logs`
Application logs
- `errors.log` - Error tracking
- `test-blocked.log` - Test execution logs
- `test-hook.log` - Hook testing logs

### `/.amazonq/rules`
Amazon Q AI assistant rules and memory bank

### `/.claude`
Claude AI assistant configuration
- `agents/` - Agent definitions
- `SECURITY.md` - Security guidelines
- `settings.json` - Configuration settings

## Core Components and Relationships

### Architecture Pattern
**Layered Architecture with Repository Pattern**

```
UI Layer (React Components)
    ↓
Hooks Layer (React Query + Custom Hooks)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Database Layer (SQLite)
```

### Data Flow
1. **User Interaction** → React components in `/src`
2. **State Management** → Custom hooks (`useCases.ts`) with React Query
3. **Business Logic** → Services (`AIService`, `CaseService`)
4. **Data Access** → Repositories (`CaseRepository`)
5. **Persistence** → SQLite database via better-sqlite3

### IPC Communication
- **Renderer Process** (React app) ↔ **Main Process** (Electron)
- Type-safe IPC channels defined in `/src/types/ipc.ts`
- Secure communication via preload script

## Technology Stack Integration

### Frontend Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Hook Form** - Form handling

### Backend Stack
- **Electron** - Desktop application framework
- **Better-SQLite3** - Database
- **Node.js** - Runtime environment

### Build Tools
- **Vite** - Fast build tool and dev server
- **TypeScript Compiler** - Type checking and compilation
- **Electron Builder** - Application packaging

### Testing
- **Vitest** - Unit testing framework
- **Testing Library** - React component testing
