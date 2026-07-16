import { NextResponse, type NextRequest } from 'next/server';
import { badRequest, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getStoreDateKey } from '@/lib/store-time';

const categories = new Set(['filament', 'packaging', 'maintenance', 'tool', 'shipping', 'energy', 'other']);
const paymentStatuses = new Set(['pending', 'paid', 'canceled']);

export async function GET(request: NextRequest) {
  const auth = await requirePermission('inventory.manage');
  if (auth.response) return auth.response;
  const months = Math.min(24, Math.max(1, Number(request.nextUrl.searchParams.get('months') ?? 6)));
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data, error } = await getSupabaseAdmin()
    .from('inventory_expenses')
    .select('*, material:inventory_materials(id, name, color_name, color_hex)')
    .gte('purchase_date', getStoreDateKey(since))
    .order('purchase_date', { ascending: false })
    .limit(500);
  if (error) return serverError('Erro ao carregar gastos. Aplique a migration mais recente no Supabase.');
  return NextResponse.json({ expenses: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requirePermission('inventory.manage');
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const category = typeof body?.category === 'string' ? body.category : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const amount = Number(body?.amount);
  const quantity = Number(body?.quantity ?? 1);
  const paymentStatus = typeof body?.payment_status === 'string' ? body.payment_status : 'paid';
  if (!categories.has(category)) return badRequest('Categoria inválida');
  if (!description) return badRequest('A descrição é obrigatória');
  if (!Number.isFinite(amount) || amount < 0) return badRequest('Valor inválido');
  if (!Number.isFinite(quantity) || quantity <= 0) return badRequest('Quantidade inválida');
  if (!paymentStatuses.has(paymentStatus)) return badRequest('Situação de pagamento inválida');

  const { data, error } = await getSupabaseAdmin().from('inventory_expenses').insert({
    category,
    description,
    amount,
    quantity,
    supplier_name: typeof body?.supplier_name === 'string' ? body.supplier_name.trim() || null : null,
    material_id: typeof body?.material_id === 'string' && body.material_id ? body.material_id : null,
    purchase_date: typeof body?.purchase_date === 'string' ? body.purchase_date : getStoreDateKey(),
    payment_status: paymentStatus,
    notes: typeof body?.notes === 'string' ? body.notes.trim() || null : null,
    created_by: auth.user.id,
  }).select('*').single();
  if (error) return serverError(`Erro ao registrar gasto: ${error.message}`);
  return NextResponse.json({ expense: data }, { status: 201 });
}
