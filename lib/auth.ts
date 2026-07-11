import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';

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
            'id, email, name, role, password_hash, two_fa_enabled, two_fa_secret, two_fa_backup_codes',
          )
          .eq('email', credentials.email.toLowerCase().trim())
          .maybeSingle();

        const user = data as
          | {
              id: string;
              email: string;
              name: string | null;
              role: 'user' | 'admin';
              password_hash: string;
              two_fa_enabled: boolean;
              two_fa_secret?: string;
              two_fa_backup_codes?: string[];
            }
          | null;

        if (error || !user) return null;

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

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'user' | 'admin';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
};
