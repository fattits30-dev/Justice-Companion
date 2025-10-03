# Justice Companion - Technology Stack

## Programming Languages

### TypeScript 5.6
- Primary language for all application code
- Strict type checking enabled
- ES modules with `.js` extension imports
- Explicit return types required

### JavaScript
- Build output and configuration files
- PostCSS and Tailwind configuration

### SQL
- Database migrations and schema definitions
- SQLite dialect

## Core Technologies

### Frontend Framework
- **React 18.3.1** - UI library with hooks and functional components
- **React DOM 18.3.1** - DOM rendering

### Desktop Framework
- **Electron 32.1.0** - Cross-platform desktop application
- **Node.js >= 18** - Runtime requirement

### Database
- **Better-SQLite3 11.3.0** - Synchronous SQLite3 bindings
- **SQLite** - Embedded relational database

## UI and Styling

### CSS Framework
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **PostCSS 8.4** - CSS processing
- **Autoprefixer 10.4** - CSS vendor prefixing

### UI Libraries
- **Lucide React 0.441.0** - Icon library
- **Framer Motion 11.5.0** - Animation library
- **clsx 2.1.1** - Conditional className utility
- **tailwind-merge 2.5.0** - Tailwind class merging

## State Management

### Server State
- **TanStack React Query 5.56.0** - Async state management, caching, and synchronization

### Client State
- **Zustand 5.0.0** - Lightweight state management

### Form State
- **React Hook Form 7.53.0** - Form validation and management

## Routing
- **React Router DOM 6.26.0** - Client-side routing

## Build Tools

### Development Server
- **Vite 5.4.0** - Fast dev server and build tool
- **@vitejs/plugin-react 4.3.1** - React support for Vite

### Electron Integration
- **vite-plugin-electron 0.28.7** - Electron integration
- **vite-plugin-electron-renderer 0.14.5** - Renderer process support
- **vite-plugin-static-copy 3.1.3** - Static file copying

### Build and Package
- **Electron Builder 25.0.5** - Application packaging
- **electron-rebuild 3.2.9** - Native module rebuilding

## Testing

### Test Framework
- **Vitest 2.1.0** - Unit testing framework
- **@testing-library/react 16.0.0** - React component testing
- **@testing-library/jest-dom 6.5.0** - DOM matchers

## Code Quality

### Linting
- **ESLint 9.10.0** - JavaScript/TypeScript linting
- **@typescript-eslint/eslint-plugin 8.5.0** - TypeScript rules
- **@typescript-eslint/parser 8.5.0** - TypeScript parser

### Formatting
- **Prettier** - Code formatting (configured via .prettierrc.json)
- 2-space indentation
- Semicolons required
- Single quotes preferred

## Development Commands

### Development
```bash
npm run dev                 # Start Vite dev server
npm run electron:dev        # Start Electron with Vite dev server
```

### Building
```bash
npm run build              # Full build (TypeScript + Vite + Electron Builder)
npm run build:win          # Build for Windows
npm run build:mac          # Build for macOS
npm run build:linux        # Build for Linux
npm run electron:build     # Build Electron app only
```

### Testing
```bash
npm test                   # Run Vitest tests
npm run type-check         # TypeScript type checking
npm run lint               # Run ESLint
```

### Preview
```bash
npm run preview            # Preview production build
```

## Build Configuration

### TypeScript
- `tsconfig.json` - Main TypeScript configuration
- `tsconfig.node.json` - Node.js specific configuration
- Strict mode enabled
- ES modules output

### Electron Builder
- **App ID**: com.justicecompanion.app
- **Product Name**: Justice Companion
- **Output Directory**: release/
- **Windows**: NSIS installer
- **macOS**: DMG package
- **Linux**: AppImage and DEB packages

## Dependencies Overview

### Production Dependencies (11)
Core runtime dependencies including React, Electron, database, and UI libraries

### Development Dependencies (24)
Build tools, testing frameworks, TypeScript tooling, and code quality tools

## Node.js Requirements
- **Minimum Version**: Node.js 18 or higher
- **Package Manager**: npm (lock file present)

## Development Utilities
- **concurrently 9.0.0** - Run multiple commands simultaneously
- **wait-on 8.0.0** - Wait for resources before starting processes
