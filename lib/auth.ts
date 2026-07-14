import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeAdminAccessLevel } from '@/lib/admin-permissions';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
        twoFACode: { label: '2FA Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = getSupabaseAdmin();
        const { data, error } = await admin
          .from('users')
          .select(
            'id, email, name, role, admin_access_level, admin_active, password_hash, two_fa_enabled, two_fa_secret, two_fa_backup_codes',
          )
          .eq('email', credentials.email.toLowerCase().trim())
          .maybeSingle();

        const user = data as
          | {
              id: string;
              email: string;
              name: string | null;
              role: 'user' | 'admin';
              admin_access_level?: 'owner' | 'partner' | null;
              admin_active?: boolean;
              password_hash: string;
              two_fa_enabled: boolean;
              two_fa_secret?: string;
              two_fa_backup_codes?: string[];
            }
          | null;

        if (error || !user || (user.role === 'admin' && user.admin_active === false)) return null;

        const ok = await bcrypt.compare(credentials.password, user.password_hash);
        if (!ok) return null;

        if (user.two_fa_enabled && !credentials.twoFACode) {
          const err = new Error('2FA_REQUIRED');
          (err as any).code = '2FA_REQUIRED';
          (err as any).userId = user.id;
          throw err;
        }

        if (user.two_fa_enabled && credentials.twoFACode) {
          const { verify2FA, verifyBackupCode, hashBackupCode } = await import('@/lib/2fa');

          const normalizedCode = credentials.twoFACode
            .toUpperCase()
            .replace(/\s/g, '');

          let isValid = verify2FA(user.two_fa_secret!, normalizedCode);
          let usingBackupCode = false;

          if (!isValid && user.two_fa_backup_codes?.length) {
            const backupResult = verifyBackupCode(
              user.two_fa_backup_codes,
              normalizedCode,
            );
            if (backupResult.valid) {
              isValid = true;
              usingBackupCode = true;

              await admin
                .from('users')
                .update({
                  two_fa_backup_codes: backupResult.remaining,
                })
                .eq('id', user.id);
            }
          }

          if (!isValid) return null;
        }

        const accessLevel = user.role === 'admin'
          ? normalizeAdminAccessLevel(user.admin_access_level)
          : null;

        const loginAt = new Date().toISOString();
        await Promise.all([
          admin.from('users').update({ last_login_at: loginAt, last_seen_at: loginAt }).eq('id', user.id),
          admin.from('user_activity_events').insert({
            user_id: user.id,
            event_type: 'login',
            path: '/login',
            metadata: {},
            created_at: loginAt,
          }),
        ]);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role,
          accessLevel,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as 'user' | 'admin';
        token.accessLevel = user.accessLevel ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'user' | 'admin';
        session.user.accessLevel = token.accessLevel ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
};
