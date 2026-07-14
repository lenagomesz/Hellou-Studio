import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/api';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Central administrativa',
  robots: { index: false, follow: false, noarchive: true },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <AdminShell
      userEmail={user?.email ?? null}
      accessLevel={user?.role === 'admin' ? (user.accessLevel ?? 'owner') : 'owner'}
    >
      {children}
    </AdminShell>
  );
}
