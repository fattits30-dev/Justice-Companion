# Testing Guide - Justice Companion

## Overview

Justice Companion uses **Vitest** and **React Testing Library** for comprehensive testing. This guide explains how to write, run, and maintain tests across the codebase.

## Test Types

### 1. Component Tests (`.test.tsx`)
- **Environment**: jsdom (simulates browser DOM)
- **Location**: Co-located with components (e.g., `ChatInput.test.tsx`)
- **Focus**: User-facing behavior, accessibility, interactions
- **Tools**: React Testing Library, userEvent, jest-dom matchers

### 2. Service/Repository Tests (`.test.ts`)
- **Environment**: Node.js
- **Location**: Co-located with source files (e.g., `CaseService.test.ts`)
- **Focus**: Business logic, data access, error handling
- **Tools**: Vitest, mocks for database/IPC

## Running Tests

```bash
# Run all tests (one-time)
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Visual UI (interactive test viewer)
npm run test:ui

# Component tests only
npm run test:components

# Component tests in watch mode
npm run test:components:watch

# Service/repository tests only
npm run test:services

# Coverage report
npm run test:coverage
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI/CD

**Coverage Goals**:
- Lines: 70%+
- Functions: 70%+
- Branches: 70%+
- Statements: 70%+

## Writing Component Tests

### Example: ChatInput Component

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test-utils/test-utils';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('should send message when Enter is pressed', async () => {
    const user = userEvent.setup();
    const mockOnSend = vi.fn();

    render(<ChatInput onSend={mockOnSend} />);

    const textarea = screen.getByLabelText('Message input');
    await user.type(textarea, 'Hello{Enter}');

    expect(mockOnSend).toHaveBeenCalledWith('Hello');
  });
});
```

### Best Practices

#### 1. Test User Behavior, Not Implementation
```tsx
// GOOD: Tests what the user sees/does
const button = screen.getByRole('button', { name: 'Send message' });
await user.click(button);

// BAD: Tests internal state
expect(component.state.value).toBe('...');
```

#### 2. Use Semantic Queries
```tsx
// GOOD: Queries by role/label (accessible)
screen.getByRole('button', { name: 'Send' });
screen.getByLabelText('Message input');

// BAD: Fragile queries
screen.getByClassName('send-btn');
screen.getByTestId('message-input');
```

#### 3. Use userEvent, Not fireEvent
```tsx
// GOOD: Simulates real user interactions
await user.type(textarea, 'Hello');
await user.click(button);

// BAD: Low-level events
fireEvent.change(textarea, { target: { value: 'Hello' } });
```

#### 4. Test Accessibility
```tsx
it('should have proper ARIA labels', () => {
  render(<ChatInput onSend={mockOnSend} />);

  expect(screen.getByLabelText('Message input')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
});
```

#### 5. Mock External Dependencies
```tsx
import { vi } from 'vitest';

// Mock IPC API
beforeEach(() => {
  window.justiceAPI = {
    createCase: vi.fn().mockResolvedValue({ success: true }),
  };
});
```

## Writing Service Tests

### Service Test Coverage (2025-10-06)

Justice Companion has comprehensive service layer tests:

| Service | Tests | Lines | Status |
|---------|-------|-------|--------|
| NotesService | 15 | 283 | ✅ 100% |
| LegalIssuesService | 26 | 498 | ✅ 100% |
| TimelineService | 28 | 581 | ✅ 100% |
| UserFactsService | 27 | 552 | ✅ 100% |
| CaseFactsService | 32 | 688 | ✅ 100% |
| **TOTAL** | **128** | **2,602** | **✅ 100%** |

### Example: Service Test with Mocking

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegalIssuesService } from './LegalIssuesService';
import { legalIssuesRepository } from '../repositories/LegalIssuesRepository';
import { errorLogger } from '../utils/error-logger';

// Mock dependencies
vi.mock('../repositories/LegalIssuesRepository', () => ({
  legalIssuesRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByCaseId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../utils/error-logger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('LegalIssuesService', () => {
  let service: LegalIssuesService;

  beforeEach(() => {
    service = new LegalIssuesService();
    vi.clearAllMocks();
  });

  it('should create a legal issue with valid input', () => {
    const mockLegalIssue = {
      id: 1,
      caseId: 100,
      title: 'Wrongful Termination',
      description: 'Employee was terminated without cause',
      createdAt: '2025-10-06T00:00:00.000Z',
      updatedAt: '2025-10-06T00:00:00.000Z',
    };

    vi.mocked(legalIssuesRepository.create).mockReturnValue(mockLegalIssue);

    const result = service.createLegalIssue({
      caseId: 100,
      title: 'Wrongful Termination',
      description: 'Employee was terminated without cause',
    });

    expect(result).toEqual(mockLegalIssue);
    expect(legalIssuesRepository.create).toHaveBeenCalledWith({
      caseId: 100,
      title: 'Wrongful Termination',
      description: 'Employee was terminated without cause',
    });
    expect(errorLogger.logError).toHaveBeenCalledWith(
      'Legal issue created successfully',
      expect.objectContaining({
        type: 'info',
        legalIssueId: 1,
        caseId: 100,
      })
    );
  });

  it('should throw error if title exceeds 200 characters', () => {
    const longTitle = 'a'.repeat(201);

    expect(() =>
      service.createLegalIssue({ caseId: 100, title: longTitle })
    ).toThrow('Legal issue title must be 200 characters or less');

    expect(legalIssuesRepository.create).not.toHaveBeenCalled();
  });
});
```

### Service Test Best Practices

1. **Use transactions for database tests**:
   ```ts
   afterEach(() => {
     db.exec('ROLLBACK');
   });
   ```

2. **Test edge cases**:
   - Empty input
   - Null values
   - Invalid data
   - Concurrent operations

3. **Test error handling**:
   ```ts
   it('should throw error for invalid case ID', async () => {
     await expect(service.getCase(-1)).rejects.toThrow('Invalid case ID');
   });
   ```

## Test Utilities

### Custom Render (`src/test-utils/test-utils.tsx`)

Wraps components with necessary providers:

```tsx
import { render, screen, userEvent } from '@/test-utils/test-utils';

// Automatically wraps with BrowserRouter, ThemeProvider, etc.
render(<MyComponent />);
```

### Mock IPC API

```tsx
import { createMockJusticeAPI } from '@/test-utils/test-utils';

beforeEach(() => {
  window.justiceAPI = createMockJusticeAPI({
    getCases: vi.fn().mockResolvedValue({ success: true, data: [] }),
  });
});
```

### Setup File (`src/test-utils/setup.ts`)

Runs before all tests:
- Imports `@testing-library/jest-dom` matchers
- Mocks `window.matchMedia`
- Mocks `IntersectionObserver`, `ResizeObserver`

## Common Matchers

```tsx
// jest-dom matchers (from @testing-library/jest-dom)
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveTextContent('Hello');
expect(element).toHaveClass('bg-blue-600');
expect(element).toHaveAttribute('aria-label', 'Send message');

// Vitest matchers
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(3);
expect(value).toBe(42); // strict equality
expect(value).toEqual({ key: 'value' }); // deep equality
```

## Example Tests

### ChatInput (src/components/ChatInput.test.tsx)
- ✓ Renders textarea and send button
- ✓ Enter sends message
- ✓ Shift+Enter creates new line
- ✓ Empty message does not send
- ✓ Disabled state works correctly
- ✓ Auto-resize on multi-line input
- ✓ Accessibility (ARIA labels, keyboard navigation)

### MessageBubble (src/components/MessageBubble.test.tsx)
- ✓ User vs assistant styling
- ✓ Markdown rendering for assistant
- ✓ Timestamp display
- ✓ Source citations
- ✓ AI reasoning dropdown
- ✓ Streaming indicator
- ✓ Disclaimer visibility

### ErrorBoundary (src/components/ErrorBoundary.test.tsx)
- ✓ Catches errors from children
- ✓ Shows error fallback UI
- ✓ Reload/retry actions
- ✓ Error logging to console
- ✓ Development vs production mode

## Environment-Specific Tests

Use `@vitest-environment` comment to override default (jsdom):

```ts
/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
// This test runs in Node.js environment (for services, databases, etc.)
```

## Debugging Tests

### Run a single test file
```bash
npm test -- ChatInput.test.tsx
```

### Run a single test
```bash
npm test -- -t "should send message when Enter is pressed"
```

### Use Vitest UI
```bash
npm run test:ui
# Opens interactive test viewer at http://localhost:51204/__vitest__/
```

### Add debug output
```tsx
import { screen, debug } from '@/test-utils/test-utils';

it('test name', () => {
  render(<MyComponent />);
  screen.debug(); // Prints current DOM to console
});
```

## CI/CD Integration

Tests run automatically on:
- Pre-commit hooks (Husky)
- Pull request checks (GitHub Actions)
- Pre-deployment builds

## Troubleshooting

### "Cannot find module" errors
Ensure `vitest.config.ts` has correct path alias:
```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

### "window is not defined" errors
Add `@vitest-environment jsdom` comment or check `vitest.config.ts` environment setting.

### Flaky tests
- Avoid testing timings (use `waitFor` instead of `setTimeout`)
- Use `userEvent` instead of `fireEvent`
- Mock external APIs/IPC calls

### Coverage not updating
```bash
# Clear coverage cache
rm -rf coverage/

# Re-run coverage
npm run test:coverage
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
- [User Event API](https://testing-library.com/docs/user-event/intro)

## Contributing

When adding new features:
1. Write tests FIRST (TDD)
2. Run `npm run test:watch` for instant feedback
3. Aim for 80%+ coverage on new code
4. Test user behavior, not implementation
5. Ensure accessibility (ARIA labels, keyboard navigation)
6. Document complex test scenarios

---

**Last Updated**: 2025-10-06
**Service Tests Added**: LegalIssuesService, TimelineService, UserFactsService, CaseFactsService (113 tests)
