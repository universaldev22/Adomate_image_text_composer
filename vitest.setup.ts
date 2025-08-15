import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Ensure React components are unmounted after each test to avoid
// cross-test pollution. Without this, renders from previous tests may
// remain in the document and cause queries like `getByText` or
// `getByRole` to find multiple elements, leading to false failures.
afterEach(() => {
  cleanup();
});
