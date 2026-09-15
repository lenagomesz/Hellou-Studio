import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

const BUCKET = 'customization-images';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 20;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const formData = await request.formData();
  const files = formData.getAll('images').filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) return NextResponse.json({ error: 'Selecione pelo menos uma foto' }, { status: 400 });
  if (files.length > MAX_IMAGES) return NextResponse.json({ error: `Envie no máximo ${MAX_IMAGES} fotos` }, { status: 400 });

  for (const file of files) {
    if (!IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: `${file.name}: use JPG, PNG ou WebP` }, { status: 400 });
    if (file.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: `${file.name} ultrapassa 10 MB` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: bucket } = await admin.storage.getBucket(BUCKET);
  if (!bucket) {
    const { error } = await admin.storage.createBucket(BUCKET, { public: false });
    if (error) return NextResponse.json({ error: 'Não foi possível preparar o envio das fotos' }, { status: 500 });
  }

  const uploadedPaths: string[] = [];
  for (const [index, file] of files.entries()) {
    const path = `${auth.user.id}/${crypto.randomUUID()}-${index}-${safeFileName(file.name)}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      if (uploadedPaths.length > 0) await admin.storage.from(BUCKET).remove(uploadedPaths);
      return NextResponse.json({ error: `Não foi possível enviar ${file.name}` }, { status: 500 });
    }
    uploadedPaths.push(path);
  }

  return NextResponse.json({
    urls: uploadedPaths.map((path) => `/api/customization-images/${path.split('/').map(encodeURIComponent).join('/')}`),
  });
}
