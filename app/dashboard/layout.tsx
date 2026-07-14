import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/api';
import { AdminShell } from '@/components/admin/AdminShell';

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
