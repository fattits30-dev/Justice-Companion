# E2E Playwright tests for Justice Companion

Quick start (headed):

1. Start the frontend dev server (example):
   - If you're iterating locally, start your dev server so the app is available at `http://localhost:5173` (or set `E2E_BASE_URL`). For Flutter web builds you can serve the static build:
     - `python3 -m http.server 5173 --directory build/web &`
     - or `npx http-server build/web -p 5173`
   - If you need to build from source (recommended for CI), run `flutter build web` at the repo root to produce `build/web`.
2. Install dependencies and Playwright browsers:
   - cd e2e && npm install --no-audit --no-fund
   - Install browsers if needed: `npx playwright install chromium` (or `npx playwright install --with-deps` if your environment supports it)
3. Run headed tests locally:
   - npm run test:headed
   - Slow/visual runs: `npm run test:headed-slow` or `npm run test:slow`. These set `PLAYWRIGHT_SLOWMO=200` by default (ms per action); set `PLAYWRIGHT_SLOWMO` directly to tune the speed.

Notes:
- For CI we include a `build-frontend` job that runs `flutter build web`, uploads the artifact and the `test` job runs inside the official Playwright Docker image (browsers preinstalled).
- To view the HTML report after a run: `npx playwright show-report` or open `e2e/playwright-report/index.html`.

Environment:
- Set `E2E_BASE_URL` to point to your running frontend (defaults to `http://localhost:5173`).

Tips:
- For CI, run `npm ci && npm run install-browsers && npm test`.
- The Playwright HTML report is generated in `playwright-report/` by default.
