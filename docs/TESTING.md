# Testing Guide - Justice Companion

## Overview

Justice Companion uses **Vitest** as its test runner with **React Testing Library** for component testing. This guide covers testing patterns, best practices, and how to run tests.

## Test Stack

- **Test Runner**: [Vitest](https://vitest.dev/) v2.1.9
- **Component Testing**: [React Testing Library](https://testing-library.com/react) v16.0.0
- **User Interactions**: [@testing-library/user-event](https://testing-library.com/docs/user-event/intro) v14.6.1
- **DOM Matchers**: [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) v6.5.0
- **Environment**: jsdom v27.0.0 (simulates browser environment)

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- ChatInput.test.tsx
```

### Run Component Tests Only
```bash
npm run test:components
```

### Watch Mode (Auto-rerun on file changes)
```bash
npm run test:components:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Visual UI (Interactive Test Browser)
```bash
npm run test:ui
```

## Project Structure

Tests are **co-located** with source files:

```
src/
├── components/
│   ├── ChatInput.tsx
│   ├── ChatInput.test.tsx          # ✅ Component test
│   ├── MessageBubble.tsx
│   └── MessageBubble.test.tsx      # ✅ Component test
├── services/
│   ├── EncryptionService.ts
│   └── EncryptionService.test.ts   # ✅ Service test (Node environment)
├── test-utils/
│   ├── setup.ts                    # Global test setup
│   └── test-utils.ts               # Custom render, utilities
```

## Writing Component Tests

### Basic Test Structure

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test-utils/test-utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render with correct text', () => {
    render(<MyComponent text="Hello" />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### User Interaction Testing

Use `userEvent` from `@testing-library/user-event` for realistic user interactions:

```tsx
it('should handle button click', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();

  render(<MyButton onClick={handleClick} />);

  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Keyboard Interaction Testing

```tsx
it('should submit on Enter key', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<MyForm onSubmit={onSubmit} />);

  const input = screen.getByRole('textbox');
  await user.type(input, 'Hello{Enter}');

  expect(onSubmit).toHaveBeenCalledWith('Hello');
});
```

### Testing Async Components

Use `waitFor` for async state updates:

```tsx
it('should load data', async () => {
  render(<MyAsyncComponent />);

  // Wait for loading state to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

## Testing Patterns

### 1. Query Priority (Semantic Queries First)

Prefer queries that mirror user behavior:

**✅ GOOD** (Accessible to users and assistive tech):
```tsx
screen.getByRole('button', { name: /send message/i });
screen.getByLabelText('Email address');
screen.getByPlaceholderText('Enter your name...');
screen.getByText('Welcome');
```

**❌ AVOID** (Implementation details):
```tsx
screen.getByTestId('submit-btn');  // Only use as last resort
```

### 2. Mock Functions with `vi.fn()`

```tsx
import { vi } from 'vitest';

const mockCallback = vi.fn();

// Assert it was called
expect(mockCallback).toHaveBeenCalled();
expect(mockCallback).toHaveBeenCalledTimes(2);
expect(mockCallback).toHaveBeenCalledWith('expected', 'args');
```

### 3. Mocking window.justiceAPI (Electron IPC)

For components that interact with Electron's IPC:

```tsx
beforeEach(() => {
  // Mock global window.justiceAPI
  window.justiceAPI = {
    createCase: vi.fn().mockResolvedValue({ success: true, case: { id: 1 } }),
    getCase: vi.fn().mockResolvedValue({ success: true, case: { id: 1, title: 'Test' } }),
    // ... other IPC methods
  };
});

afterEach(() => {
  vi.clearAllMocks();
});
```

### 4. Mocking External Dependencies

Mock entire modules:

```tsx
vi.mock('./SourceCitation', () => ({
  SourceCitation: ({ sources }: { sources: string[] }) => (
    <div data-testid="source-citation">Sources: {sources.length}</div>
  ),
}));
```

### 5. Testing Styles and CSS Classes

```tsx
it('should apply disabled styling', () => {
  render(<MyButton disabled={true} />);

  const button = screen.getByRole('button');
  expect(button).toHaveClass('bg-gray-300', 'cursor-not-allowed');
});
```

### 6. Accessibility Testing

Always test ARIA attributes and keyboard navigation:

```tsx
it('should have proper ARIA labels', () => {
  render(<MyComponent />);

  const button = screen.getByRole('button', { name: 'Close dialog' });
  expect(button).toHaveAttribute('aria-label', 'Close dialog');
  expect(button).toHaveAttribute('aria-expanded', 'false');
});
```

### 7. Snapshot Testing (Use Sparingly)

Only for complex, stable UI structures:

```tsx
it('should match snapshot', () => {
  const { container } = render(<MyComplexComponent />);
  expect(container).toMatchSnapshot();
});
```

**⚠️ Warning**: Snapshots are brittle and hard to maintain. Prefer explicit assertions.

## Common Patterns: ChatInput Example

### Rendering Tests
```tsx
it('should render textarea and send button', () => {
  render(<ChatInput onSend={vi.fn()} />);

  expect(screen.getByRole('textbox')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
});
```

### Keyboard Shortcut Tests
```tsx
it('should send message on Enter key', async () => {
  const user = userEvent.setup();
  const onSend = vi.fn();

  render(<ChatInput onSend={onSend} />);

  const textarea = screen.getByRole('textbox');
  await user.type(textarea, 'Test message{Enter}');

  expect(onSend).toHaveBeenCalledWith('Test message');
});
```

### Disabled State Tests
```tsx
it('should disable textarea when disabled prop is true', () => {
  render(<ChatInput onSend={vi.fn()} disabled={true} />);

  const textarea = screen.getByRole('textbox');
  expect(textarea).toBeDisabled();
});
```

## Common Patterns: MessageBubble Example

### User vs Assistant Messages
```tsx
it('should render user message with correct styling', () => {
  const userMessage: ChatMessage = {
    role: 'user',
    content: 'My question',
    timestamp: '2025-10-05T14:30:00.000Z',
  };

  render(<MessageBubble message={userMessage} />);

  const messageBubble = screen.getByText('My question').parentElement;
  expect(messageBubble).toHaveClass('bg-blue-600', 'text-white');
});
```

### Markdown Rendering
```tsx
it('should render assistant message as markdown', () => {
  const message: ChatMessage = {
    role: 'assistant',
    content: 'The **Employment Rights Act 1996** protects your rights.',
  };

  render(<MessageBubble message={message} />);

  const boldText = screen.getByText('Employment Rights Act 1996');
  expect(boldText.tagName).toBe('STRONG');
});
```

### Expandable Sections
```tsx
it('should expand and collapse reasoning content', async () => {
  const user = userEvent.setup();
  const message: ChatMessage = {
    role: 'assistant',
    content: 'Response',
    thinkingContent: 'AI reasoning...',
  };

  render(<MessageBubble message={message} />);

  const button = screen.getByRole('button', { name: /expand ai reasoning/i });

  // Initially collapsed
  expect(screen.queryByText('AI reasoning...')).not.toBeInTheDocument();

  // Expand
  await user.click(button);
  expect(screen.getByText('AI reasoning...')).toBeInTheDocument();
});
```

## Test Environments

### jsdom (Default for Components)

Component tests run in **jsdom** environment by default (configured in `vitest.config.ts`):

```tsx
// No environment comment needed - jsdom is default
describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    // ...
  });
});
```

### Node (For Services, Utilities, Repositories)

Service tests use **Node** environment:

```ts
/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';

describe('EncryptionService', () => {
  it('should encrypt data', () => {
    // Node environment test
  });
});
```

## Coverage Requirements

Current coverage thresholds (defined in `vitest.config.ts`):

- **Lines**: 60%
- **Functions**: 60%
- **Branches**: 60%
- **Statements**: 60%

**Goal**: Increase to 80%+ for all metrics.

## Best Practices

### ✅ DO

- **Use semantic queries**: `getByRole`, `getByLabelText`, `getByText`
- **Test user behavior**, not implementation details
- **Use `userEvent`** for realistic interactions (not `fireEvent`)
- **Mock external dependencies** (IPC, APIs, complex components)
- **Test accessibility**: ARIA labels, keyboard navigation
- **Group related tests** with `describe` blocks
- **Clean up mocks** with `beforeEach` and `afterEach`
- **Test edge cases**: empty inputs, disabled states, error states

### ❌ DON'T

- **Don't test implementation details** (internal state, class names for logic)
- **Don't use `getByTestId`** unless absolutely necessary
- **Don't test library code** (React, React Markdown, etc.)
- **Don't create brittle snapshot tests**
- **Don't forget to clean up mocks** between tests
- **Don't test multiple behaviors** in a single test
- **Don't skip accessibility tests**

## Debugging Tests

### View Test Output
```bash
npm test -- --reporter=verbose
```

### Run Single Test
```tsx
it.only('should debug this test', () => {
  // Only this test will run
});
```

### Skip Test Temporarily
```tsx
it.skip('should fix this later', () => {
  // Test will be skipped
});
```

### Debug in Browser
```bash
npm run test:ui
```

This opens a visual UI where you can inspect test results and re-run tests interactively.

## Troubleshooting

### "Cannot find module" Errors

Ensure imports use the `@/` alias:

```tsx
import { render } from '@/test-utils/test-utils';  // ✅ Correct
import { render } from '../test-utils/test-utils';  // ❌ Avoid
```

### Tests Timing Out

Increase timeout for slow tests:

```tsx
it('should handle slow operation', async () => {
  // Test code...
}, 10000); // 10 second timeout
```

### Window Mocking Issues

If tests fail due to `window` not being defined, ensure the test runs in jsdom environment (default).

For mocking browser APIs:

```tsx
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
```

## Example Test Files

See these files for comprehensive test examples:

- **Component Tests**:
  - `src/components/ChatInput.test.tsx` (23 tests)
  - `src/components/MessageBubble.test.tsx` (32 tests)

- **Service Tests**:
  - `src/services/EncryptionService.test.ts`
  - `src/services/AuditLogger.test.ts`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library Docs](https://testing-library.com/react)
- [Jest-DOM Matchers](https://github.com/testing-library/jest-dom)
- [User Event API](https://testing-library.com/docs/user-event/intro)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: 2025-10-05
