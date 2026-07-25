import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback: (scope: {
    setLevel: ReturnType<typeof vi.fn>;
    setTag: ReturnType<typeof vi.fn>;
    setContext: ReturnType<typeof vi.fn>;
  }) => void) => callback({
    setLevel: vi.fn(),
    setTag: vi.fn(),
    setContext: vi.fn(),
  })),
}));
