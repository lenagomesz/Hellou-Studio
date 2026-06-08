import { Skeleton, OrderSkeleton } from '@/components/ui/Skeleton';

export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="mt-8 space-y-4">
        <OrderSkeleton />
        <OrderSkeleton />
      </div>
    </div>
  );
}
