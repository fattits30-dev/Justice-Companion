# Quick Start Guide - Justice Companion

## 🚀 Starting the Application

### Full Application (Recommended for Development)
```bash
pnpm start
# or
pnpm dev
```
This launches both the React frontend (Vite) and the Electron desktop application.

### Frontend Only (For UI Development)
```bash
pnpm start:frontend
# or
pnpm dev:frontend
```
This only starts the Vite dev server at http://localhost:5176

## 📝 Command Reference

| Command | Description | What it does |
|---------|-------------|--------------|
| `pnpm start` | **Start full application** | Launches Vite + Electron desktop app |
| `pnpm dev` | **Same as start** | Launches Vite + Electron desktop app |
| `pnpm start:full` | **Explicit full stack** | Same as above, more explicit naming |
| `pnpm start:frontend` | **Frontend only** | Only starts Vite dev server |
| `pnpm dev:frontend` | **Frontend only** | Only starts Vite dev server |
| `pnpm dev:smart` | **Smart port manager** | Starts with intelligent port allocation |
| `pnpm electron:dev` | **Traditional command** | Original Electron + Vite command |

## 🔧 Common Scenarios

### I want to develop the full application:
```bash
pnpm start
```

### I only want to work on React components:
```bash
pnpm start:frontend
```

### Port 5176 is already in use:
```bash
pnpm dev:smart
```
This will automatically find an available port or offer to kill the blocking process.

### I want to build for production:
```bash
pnpm build:win    # Windows
pnpm build:mac    # macOS
pnpm build:linux  # Linux
```

## 🐛 Troubleshooting

### Application won't start?
1. Make sure Node.js 20.x is installed: `node --version`
2. Install dependencies: `pnpm install`
3. Check if ports are available: `pnpm dev:smart`

### Database errors?
1. Set encryption key in `.env` file
2. Run migrations: `pnpm db:migrate`

### Tests failing?
1. Rebuild native modules: `pnpm rebuild:node`
2. Run tests: `pnpm test`

## 🎯 Pro Tips

- Use `pnpm start` for daily development - it's the simplest command
- The application will auto-reload when you save changes
- Press `Ctrl+Shift+I` in the Electron app to open DevTools
- Check the terminal for backend logs and browser DevTools for frontend logs

---

**Remember:** `pnpm start` or `pnpm dev` is all you need to get started!