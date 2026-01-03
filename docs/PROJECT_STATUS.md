# Justice Companion - Project Status

> NOTE: The frontend is Flutter (Dart). Legacy React/Vite notes have been removed.

**Last Updated:** 2025-01-03  
**Version:** 1.0.0  
**Status:** Needs re-verification after Flutter migration

---

## Current Status (Verify Locally)

Run the health check and standard scripts to confirm status on your machine:

```bash
./scripts/health-check.sh
./scripts/dev.sh full
```

---

## Services (Default Ports)

- **Frontend (Flutter web):** http://localhost:5176
- **Backend API:** http://localhost:8000

Override the web port with `FLUTTER_WEB_PORT` if needed.

---

## Testing

```bash
./scripts/test.sh frontend   # Flutter tests
./scripts/test.sh e2e        # Flutter integration tests (if present)
./scripts/test.sh backend    # Backend pytest
```

---

## Known Issues

- No issues tracked here; check GitHub issues for current bugs or tasks.

---

## Legacy Notes

- The previous React/Vite status report has been archived; see `.react_backup/` for old frontend artifacts if needed.
