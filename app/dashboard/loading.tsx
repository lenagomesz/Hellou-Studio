export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="Carregando painel" role="status">
      <div className="h-36 animate-pulse rounded-[28px] bg-gradient-to-r from-slate-100 via-pink-50 to-orange-50" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
      </div>
      <span className="sr-only">Carregando conteúdo administrativo…</span>
    </div>
  );
}
