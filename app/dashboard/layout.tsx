import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/api';
import { SideNav } from '@/components/admin/SideNav';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <SideNav userEmail={user?.email ?? null} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
