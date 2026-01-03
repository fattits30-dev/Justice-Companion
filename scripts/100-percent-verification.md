# How to Achieve 100% File Usage Verification

## Current Status: Needs Re-Verification

This checklist is updated for the Flutter + FastAPI stack. Run the commands
below to verify usage and coverage before declaring 100% confidence.

## 1. Frontend (Flutter/Dart)

### Baseline checks

```bash
flutter analyze
dart format --set-exit-if-changed .
flutter test
```

### Optional unused dependency checks

```bash
# Optional: add a dependency validator
dart pub global activate dependency_validator
dependency_validator

# Optional: metrics tooling
dart pub global activate dart_code_metrics
dart_code_metrics:metrics lib
```

## 2. Backend (Python/FastAPI)

```bash
pip install vulture pylint coverage

vulture backend/ --min-confidence 80
pylint backend/ --disable=all --enable=unused-import
pytest --cov=backend --cov-report=html
```

## 3. Runtime Code Coverage

### Frontend

```bash
flutter test --coverage
```

### Backend

```bash
pytest --cov=backend --cov-report=term-missing
```

## 4. API Endpoint Usage Tracking

Create middleware to log all API calls:

```python
# backend/middleware/usage_tracker.py
import logging
from collections import defaultdict

api_usage = defaultdict(int)

@app.middleware("http")
async def track_endpoint_usage(request, call_next):
    endpoint = f"{request.method} {request.url.path}"
    api_usage[endpoint] += 1
    logging.info(f"Endpoint called: {endpoint}")
    return await call_next(request)
```

Run the app for a full usage cycle and identify endpoints never called.

## 5. Dependency Graph Analysis

```bash
dart pub deps --style=compact > dart-deps.txt
pydeps backend --only backend -o backend-deps.svg
```

## 6. Build Artifact Review

```bash
flutter build web
ls -la build/web
```

Check that expected Dart assets and web output are present. For Android builds:

```bash
flutter build apk --debug
```

## Action Plan for 100%

### Phase 1: Automated Analysis (1 hour)

```bash
flutter analyze
flutter test --coverage
vulture backend/ > dead-python-code.txt
dependency_validator > unused-dart-deps.txt
```

### Phase 2: Manual Review (2 hours)

- Review each flagged file
- Determine if false positive (entry points, generated files, configs)
- Confirm if truly unused
- Delete or move to `_dead_code/`

### Phase 3: Coverage Testing (3 hours)

- Run integration tests with coverage
- Identify code never executed
- Add tests or remove unused code

### Phase 4: Production Monitoring (1 week)

- Deploy with endpoint usage tracking
- Monitor which API routes are called
- Remove unused endpoints after analysis

## Final Verification Checklist

- [ ] Flutter analyze clean
- [ ] Dart format clean
- [ ] Flutter tests green (unit + integration)
- [ ] dependency_validator shows no unused Dart deps (optional)
- [ ] vulture shows no dead Python code
- [ ] Coverage reports confirm critical paths
- [ ] All API endpoints called at least once

## Estimated Time to 100%

6-8 hours of additional analysis and cleanup
