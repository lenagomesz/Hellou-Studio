import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'user' | 'admin';
      accessLevel: 'owner' | 'partner' | null;
      permissions?: import('@/lib/admin-permissions').AdminPermission[] | null;
      sessionVersion?: number;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: 'user' | 'admin';
    accessLevel?: 'owner' | 'partner' | null;
    permissions?: import('@/lib/admin-permissions').AdminPermission[] | null;
    sessionVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'user' | 'admin';
    accessLevel: 'owner' | 'partner' | null;
    permissions?: import('@/lib/admin-permissions').AdminPermission[] | null;
    sessionVersion?: number;
    revoked?: boolean;
  }
}
