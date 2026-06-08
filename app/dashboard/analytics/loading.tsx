export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
