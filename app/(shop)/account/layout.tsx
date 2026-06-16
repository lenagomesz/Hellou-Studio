import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';
import { AccountSidebar, AccountMobileNav } from '@/components/shop/AccountNav';

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/account');

  return (
    <div className="mx-auto max-w-6xl overflow-x-hidden px-4 py-6 sm:py-10 sm:px-6">
      <AccountMobileNav />
      <div className="mt-5 lg:mt-0 grid gap-5 sm:gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
        <AccountSidebar
          userName={user.name ?? null}
          userEmail={user.email}
          isAdmin={user.role === 'admin'}
        />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
