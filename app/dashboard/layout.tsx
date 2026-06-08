import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/api';
import { SideNav } from '@/components/admin/SideNav';
import { ThemeToggle } from '@/components/admin/ThemeToggle';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row dark:bg-gray-950">
      <SideNav userEmail={user?.email ?? null} />
      <main className="flex-1 p-6 md:p-10">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
