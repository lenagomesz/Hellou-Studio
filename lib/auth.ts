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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = getSupabaseAdmin();
        const { data, error } = await admin
          .from('users')
          .select('id, email, name, role, password_hash')
          .eq('email', credentials.email.toLowerCase().trim())
          .maybeSingle();

        const user = data as
          | {
              id: string;
              email: string;
              name: string | null;
              role: 'user' | 'admin';
              password_hash: string;
            }
          | null;

        if (error || !user) return null;

        const ok = await bcrypt.compare(credentials.password, user.password_hash);
        if (!ok) return null;

        const { data: banned } = await admin
          .from('banned_emails')
          .select('id')
          .eq('email', credentials.email.toLowerCase().trim())
          .maybeSingle();
        if (banned) return null;

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
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
