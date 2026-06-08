import { OrderSkeleton } from '@/components/ui/Skeleton';

export default function OrdersLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-100" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <OrderSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
