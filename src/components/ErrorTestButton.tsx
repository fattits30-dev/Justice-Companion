/**
 * ErrorTestButton Component
 *
 * Test component for verifying error boundaries.
 * Throws an error when clicked to trigger error boundary.
 *
 * DEVELOPMENT ONLY - Remove before production!
 */

import { useState } from 'react';

interface ErrorTestButtonProps {
  buttonText?: string;
  errorMessage?: string;
}

export function ErrorTestButton({
  buttonText = 'Throw Error',
  errorMessage = 'Test error triggered by ErrorTestButton',
}: ErrorTestButtonProps) {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error(errorMessage);
  }

  return (
    <button
      onClick={() => setShouldThrow(true)}
      className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      aria-label="Test error boundary by throwing an error"
    >
      {buttonText}
    </button>
  );
}
