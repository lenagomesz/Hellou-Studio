'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { ReactNode } from 'react';

export function SessionProvider({
  children,
  session,
}: {
  children: ReactNode;
  session?: Session | null;
}) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchOnWindowFocus
      refetchInterval={60}
      refetchWhenOffline={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
