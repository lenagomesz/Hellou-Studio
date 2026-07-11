import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/api';
import type { Category } from '@/types/database';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;
    const price = formData.get('price') as string | null;
    const category = (formData.get('category') as string | null) || 'encomenda';
    const stlFile = formData.get('stl') as File | null;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do produto e obrigatorio' }, { status: 400 });
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      return NextResponse.json({ error: 'Preco invalido' }, { status: 400 });
    }
    if (!stlFile) {
      return NextResponse.json({ error: 'Arquivo STL e obrigatorio' }, { status: 400 });
    }
    if (!stlFile.name.toLowerCase().endsWith('.stl')) {
      return NextResponse.json({ error: 'Apenas arquivos .stl sao aceitos' }, { status: 400 });
    }
    if (stlFile.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo deve ter menos de 50MB' }, { status: 400 });
    }

    const validCategories: Category[] = ['chaveiros', 'escritorio', 'criaturas', 'encomenda'];
    if (!validCategories.includes(category as Category)) {
      return NextResponse.json({ error: 'Categoria invalida' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Create product first
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        category: category as Category,
        type: 'digital',
        base_price: Number(price),
        active: true,
      })
      .select('*')
      .single();

    if (productError || !product) {
      console.error('[stl-upload] Product creation error:', productError);
      return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
    }

    // Upload STL file to Supabase Storage
    const fileName = stlFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const stlPath = `stl-files/${product.id}/${fileName}`;
    const stlBuffer = await stlFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(stlPath, stlBuffer, {
        contentType: 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      // Rollback: delete the product if upload fails
      await supabase.from('products').delete().eq('id', product.id);
      console.error('[stl-upload] Upload error:', uploadError);
      return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
    }

    // Update product with file_path
    const { error: updateError } = await supabase
      .from('products')
      .update({ file_path: stlPath })
      .eq('id', product.id);

    if (updateError) {
      console.error('[stl-upload] Update file_path error:', updateError);
      return NextResponse.json({ error: 'Erro ao salvar caminho do arquivo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      product: { ...product, file_path: stlPath },
    });
  } catch (error) {
    console.error('[stl-upload] Exception:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
