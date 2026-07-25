import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requirePermission } from '@/lib/api';

interface CSVRow {
  id?: string;
  name?: string;
  category?: string;
  type?: string;
  base_price?: string;
  sale_price?: string;
  description?: string;
  active?: string;
  image_url?: string;
  sku?: string;
  cost_price?: string;
  weight_grams?: string;
  length_cm?: string;
  width_cm?: string;
  height_cm?: string;
  slug?: string;
  seo_title?: string;
  seo_description?: string;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });
    rows.push(row as CSVRow);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

const VALID_CATEGORIES = ['chaveiros', 'escritorio', 'criaturas', 'encomenda'];

function validateRow(row: CSVRow, index: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row.name?.trim()) {
    errors.push(`Linha ${index + 2}: Nome é obrigatório`);
  }

  if (row.category && !VALID_CATEGORIES.includes(row.category)) {
    errors.push(`Linha ${index + 2}: Categoria invalida "${row.category}"`);
  }

  if (row.base_price) {
    const price = parseFloat(row.base_price);
    if (isNaN(price) || price < 0) {
      errors.push(`Linha ${index + 2}: Preço base inválido "${row.base_price}"`);
    }
  } else if (!row.id) {
    errors.push(`Linha ${index + 2}: Preço base é obrigatório para novos produtos`);
  }

  if (row.sale_price && row.sale_price.trim() !== '') {
    const salePrice = parseFloat(row.sale_price);
    if (isNaN(salePrice) || salePrice < 0) {
      errors.push(`Linha ${index + 2}: Preço promocional inválido "${row.sale_price}"`);
    }
  }

  for (const [field, label, allowZero] of [
    ['cost_price', 'Custo', true],
    ['weight_grams', 'Peso', false],
    ['length_cm', 'Comprimento', false],
    ['width_cm', 'Largura', false],
    ['height_cm', 'Altura', false],
  ] as const) {
    const raw = row[field];
    if (raw?.trim()) {
      const value = Number(raw);
      if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) errors.push(`Linha ${index + 2}: ${label} inválido "${raw}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// POST /api/admin/products/import - Import products from CSV
export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { csv_content, mode } = (body ?? {}) as {
    csv_content?: string;
    mode?: 'create' | 'update' | 'upsert';
  };

  if (!csv_content) return badRequest('csv_content é obrigatório');

  const importMode = mode || 'upsert';
  const rows = parseCSV(csv_content);

  if (rows.some((row) => row.active !== undefined)) {
    const statusAuth = await requirePermission('products.status.manage');
    if (statusAuth.response) return statusAuth.response;
  }

  if (rows.length === 0) {
    return badRequest('CSV vazio ou formato inválido');
  }

  // Validate all rows
  const allErrors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const { errors } = validateRow(rows[i], i);
    allErrors.push(...errors);
  }

  if (allErrors.length > 0) {
    return NextResponse.json({
      success: false,
      errors: allErrors,
      preview: rows.slice(0, 5),
    }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const userId = auth.user!.id;
  const results = { created: 0, updated: 0, errors: 0, error_details: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      if (row.id && (importMode === 'update' || importMode === 'upsert')) {
        // Update existing product
        const update: Record<string, unknown> = {};
        if (row.name) update.name = row.name.trim();
        if (row.category) update.category = row.category;
        if (row.base_price) update.base_price = parseFloat(row.base_price);
        if (row.sale_price !== undefined) {
          update.sale_price = row.sale_price.trim() === '' ? null : parseFloat(row.sale_price);
        }
        if (row.description !== undefined) update.description = row.description || null;
        if (row.active !== undefined) update.active = row.active === 'true';
        if (row.image_url !== undefined) update.image_url = row.image_url || null;
        if (row.sku !== undefined) update.sku = row.sku.trim().toUpperCase() || null;
        if (row.cost_price !== undefined) update.cost_price = row.cost_price.trim() ? Number(row.cost_price) : null;
        if (row.weight_grams !== undefined) update.weight_grams = row.weight_grams.trim() ? Math.trunc(Number(row.weight_grams)) : null;
        if (row.length_cm !== undefined) update.length_cm = row.length_cm.trim() ? Number(row.length_cm) : null;
        if (row.width_cm !== undefined) update.width_cm = row.width_cm.trim() ? Number(row.width_cm) : null;
        if (row.height_cm !== undefined) update.height_cm = row.height_cm.trim() ? Number(row.height_cm) : null;
        if (row.slug !== undefined) update.slug = row.slug.trim() || null;
        if (row.seo_title !== undefined) update.seo_title = row.seo_title.trim() || null;
        if (row.seo_description !== undefined) update.seo_description = row.seo_description.trim() || null;
        update.updated_at = new Date().toISOString();

        // Check for price change to track history
        if (update.base_price !== undefined) {
          const { data: current } = await admin
            .from('products')
            .select('base_price, sale_price')
            .eq('id', row.id)
            .maybeSingle();

          if (current) {
            const historyEntries = [];
            if (current.base_price !== update.base_price) {
              historyEntries.push({
                product_id: row.id,
                old_price: current.base_price,
                new_price: update.base_price as number,
                price_type: 'base_price',
                changed_by: userId,
              });
            }
            if (update.sale_price !== undefined && current.sale_price !== update.sale_price) {
              historyEntries.push({
                product_id: row.id,
                old_price: current.sale_price ?? 0,
                new_price: (update.sale_price as number) ?? 0,
                price_type: 'sale_price',
                changed_by: userId,
              });
            }
            if (historyEntries.length > 0) {
              await admin.from('product_price_history').insert(historyEntries);
            }
          }
        }

        const { error } = await admin
          .from('products')
          .update(update)
          .eq('id', row.id);

        if (error) {
          results.errors++;
          results.error_details.push(`Linha ${i + 2}: Erro ao atualizar - ${error.message}`);
        } else {
          results.updated++;
        }
      } else if (importMode === 'create' || importMode === 'upsert') {
        // Create new product
        const insert = {
          name: row.name!.trim(),
          category: row.category || 'chaveiros',
          type: row.type === 'digital' ? 'digital' : 'physical',
          base_price: parseFloat(row.base_price || '0'),
          sale_price: row.sale_price?.trim() ? parseFloat(row.sale_price) : null,
          description: row.description?.trim() || null,
          active: row.active !== 'false',
          image_url: row.image_url?.trim() || null,
          sku: row.sku?.trim().toUpperCase() || null,
          cost_price: row.cost_price?.trim() ? Number(row.cost_price) : null,
          weight_grams: row.weight_grams?.trim() ? Math.trunc(Number(row.weight_grams)) : null,
          length_cm: row.length_cm?.trim() ? Number(row.length_cm) : null,
          width_cm: row.width_cm?.trim() ? Number(row.width_cm) : null,
          height_cm: row.height_cm?.trim() ? Number(row.height_cm) : null,
          slug: row.slug?.trim() || null,
          seo_title: row.seo_title?.trim() || null,
          seo_description: row.seo_description?.trim() || null,
        };

        const { error } = await admin.from('products').insert(insert);

        if (error) {
          results.errors++;
          results.error_details.push(`Linha ${i + 2}: Erro ao criar - ${error.message}`);
        } else {
          results.created++;
        }
      }
    } catch (_err) {
      results.errors++;
      results.error_details.push(`Linha ${i + 2}: Erro inesperado`);
    }
  }

  return NextResponse.json({
    success: results.errors === 0,
    results,
  });
}
