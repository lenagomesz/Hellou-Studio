import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'user' | 'admin';
      accessLevel: 'owner' | 'partner' | null;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: 'user' | 'admin';
    accessLevel?: 'owner' | 'partner' | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'user' | 'admin';
    accessLevel: 'owner' | 'partner' | null;
  }
}
