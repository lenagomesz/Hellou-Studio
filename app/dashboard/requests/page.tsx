import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { PrintRequest, PrintRequestStatus, User } from '@/types/database';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<PrintRequestStatus, string> = {
  pending: 'Pendente',
  needs_info: 'Aguardando info',
  quoted: 'Orçado',
  approved: 'Aprovado',
  paid: 'Pago',
  in_production: 'Em produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  rejected: 'Rejeitado',
  canceled: 'Cancelado',
};

const STATUS_STYLES: Record<PrintRequestStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  needs_info: 'bg-amber-100 text-amber-700',
  quoted: 'bg-blue-100 text-blue-700',
  approved: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-green-100 text-green-700',
  in_production: 'bg-purple-100 text-purple-700',
  shipped: 'bg-teal-100 text-teal-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-600',
};

const VALID_STATUSES: PrintRequestStatus[] = [
  'pending', 'needs_info', 'quoted', 'approved', 'paid', 'in_production',
  'shipped', 'delivered', 'rejected', 'canceled',
];

function isValidStatus(value: string): value is PrintRequestStatus {
  return (VALID_STATUSES as string[]).includes(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type RequestRow = PrintRequest & { user?: Pick<User, 'id' | 'email' | 'name'> | null };

async function getRequests(filters: { status?: string; search?: string }) {
  const admin = getSupabaseAdmin();
  let query = admin
    .from('print_requests')
    .select('*, user:users(id, email, name)')
    .order('created_at', { ascending: false });

  if (filters.status && isValidStatus(filters.status)) {
    query = query.eq('status', filters.status);
  }

  const { data } = await query;
  let rows = (data ?? []) as RequestRow[];

  if (filters.search) {
    const term = filters.search.toLowerCase();
    rows = rows.filter((r) => {
      if (r.id.toLowerCase().includes(term)) return true;
      if (r.title.toLowerCase().includes(term)) return true;
      const email = r.user?.email?.toLowerCase() ?? '';
      const name = r.user?.name?.toLowerCase() ?? '';
      return email.includes(term) || name.includes(term);
    });
  }

  return rows;
}

export default async function AdminRequestsPage(
  props: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const searchParams = await props.searchParams;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;

  const requests = await getRequests({ status, search });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Impressões 3D</h1>
        <p className="mt-1 text-sm text-gray-600">
          {requests.length} {requests.length === 1 ? 'solicitação' : 'solicitações'}
        </p>
      </header>

      <form
        method="get"
        className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 grid gap-3 sm:grid-cols-[1fr_200px_auto]"
      >
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Buscar por título, email ou nome..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">Todos os status</option>
          {VALID_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Filtrar
        </button>
      </form>

      {requests.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 shadow-sm border border-gray-100 text-center">
          <p className="text-gray-600">Nenhuma solicitação encontrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100">
          <table className="min-w-full min-w-[640px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Título
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Arquivo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Preço
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Data
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[180px] truncate">
                    {req.title}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-gray-900">
                      {req.user?.name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {req.user?.email ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <p className="truncate max-w-[120px]">{req.stl_file_name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(req.stl_file_size)}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {req.quoted_price !== null ? formatPrice(req.quoted_price) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[req.status]}`}
                    >
                      {STATUS_LABELS[req.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(req.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/requests/${req.id}`}
                      className="text-sm font-medium text-pink-600 hover:text-pink-700"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
