import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/api';
import { stlToGlb } from '@/lib/stl-to-glb';

const BUCKET = 'products';
const MAX_MODEL_SIZE = 25 * 1024 * 1024;

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  const model = (await request.formData()).get('model');
  if (!(model instanceof File) || model.size === 0) return NextResponse.json({ error: 'Selecione um arquivo STL ou GLB' }, { status: 400 });
  const fileName = model.name.toLowerCase();
  if (!fileName.endsWith('.stl') && !fileName.endsWith('.glb')) return NextResponse.json({ error: 'Use um arquivo no formato .stl ou .glb' }, { status: 400 });
  if (model.size > MAX_MODEL_SIZE) return NextResponse.json({ error: 'O modelo 3D deve ter no máximo 25 MB' }, { status: 400 });

  let output: ArrayBuffer;
  try {
    output = fileName.endsWith('.stl') ? stlToGlb(await model.arrayBuffer()) : await model.arrayBuffer();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? `Não foi possível converter o STL: ${error.message}` : 'Não foi possível converter o STL' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: bucket } = await supabase.storage.getBucket(BUCKET);
  if (!bucket) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (error) return NextResponse.json({ error: 'Não foi possível preparar o armazenamento de produtos' }, { status: 500 });
  }
  const baseName = safeFileName(model.name).replace(/\.(stl|glb)$/i, '');
  const path = `product-models/${crypto.randomUUID()}/${Date.now()}-${baseName}.glb`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, output, {
    contentType: 'model/gltf-binary',
    upsert: false,
  });
  if (error) return NextResponse.json({ error: 'Não foi possível enviar o modelo 3D' }, { status: 500 });

  return NextResponse.json({ url: `/api/product-images/${path.split('/').map(encodeURIComponent).join('/')}` });
}
