import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeAdminAccessLevel } from '@/lib/admin-permissions';
import { getAuthSecret } from '@/lib/security-env';
import { profileAvatarImageUrl } from '@/lib/profile-avatars';

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
        let queryResult = await admin
          .from('users')
          .select(
            'id, email, name, avatar_url, role, admin_access_level, admin_permissions, admin_active, session_version, password_hash, two_fa_enabled, two_fa_secret, two_fa_backup_codes',
          )
          .eq('email', credentials.email.toLowerCase().trim())
          .maybeSingle();

        if (queryResult.error?.code === '42703') {
          const fallbackResult = await admin
            .from('users')
            .select(
              'id, email, name, role, password_hash',
            )
            .eq('email', credentials.email.toLowerCase().trim())
            .maybeSingle();

          queryResult = {
            ...fallbackResult,
            data: fallbackResult.data
              ? {
                  ...fallbackResult.data,
                  avatar_url: null,
                  admin_access_level: null,
                  admin_permissions: null,
                  admin_active: true,
                  session_version: 0,
                  two_fa_enabled: false,
                  two_fa_secret: null,
                  two_fa_backup_codes: null,
                }
              : null,
          } as typeof queryResult;
        }

        const { data, error } = queryResult;
        const user = data as
          | {
              id: string;
              email: string;
              name: string | null;
              avatar_url?: string | null;
              role: 'user' | 'admin';
              admin_access_level?: 'owner' | 'partner' | null;
              admin_permissions?: import('@/lib/admin-permissions').AdminPermission[] | null;
              admin_active?: boolean;
              session_version?: number;
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
          const err = Object.assign(new Error('2FA_REQUIRED'), {
            code: '2FA_REQUIRED',
            userId: user.id,
          });
          throw err;
        }

        if (user.two_fa_enabled && credentials.twoFACode) {
          const { verify2FA, verifyBackupCode } = await import('@/lib/2fa');

          const normalizedCode = credentials.twoFACode
            .toUpperCase()
            .replace(/\s/g, '');

          let isValid = verify2FA(user.two_fa_secret!, normalizedCode);
          if (!isValid && user.two_fa_backup_codes?.length) {
            const backupResult = verifyBackupCode(
              user.two_fa_backup_codes,
              normalizedCode,
            );
            if (backupResult.valid) {
              isValid = true;
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
          image: profileAvatarImageUrl(user.avatar_url),
          role: user.role,
          accessLevel,
          permissions: user.admin_permissions ?? null,
          sessionVersion: user.session_version ?? 0,
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
        token.permissions = user.permissions ?? null;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.avatarUrl = user.image ?? null;
        token.revoked = false;
      } else if (token.id) {
        const { data, error } = await getSupabaseAdmin()
          .from('users')
          .select('session_version, admin_active, avatar_url')
          .eq('id', token.id)
          .maybeSingle();
        if (!error && (!data
          || Number(data.session_version ?? 0) !== Number(token.sessionVersion ?? 0)
          || (token.role === 'admin' && data.admin_active === false))) {
          token.revoked = true;
        }
        if (!error && data) {
          token.avatarUrl = profileAvatarImageUrl(data.avatar_url);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.revoked) {
        return { ...session, user: undefined } as unknown as typeof session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'user' | 'admin';
        session.user.accessLevel = token.accessLevel ?? null;
        session.user.permissions = token.permissions ?? null;
        session.user.image = token.avatarUrl ?? null;
      }
      return session;
    },
  },
  secret: getAuthSecret(),
};
