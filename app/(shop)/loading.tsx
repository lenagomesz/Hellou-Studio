export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-400" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}
