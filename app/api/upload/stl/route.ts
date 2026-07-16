import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isCategory, requireAdmin } from '@/lib/api';
import type { Category, Product } from '@/types/database';

export const maxDuration = 300;

const STL_BUCKET = 'products';
const IMAGE_BUCKET = 'stl-products';
const MAX_STL_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGES = 6;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type ProductFields = {
  name: string;
  description: string | null;
  price: number;
  category: Category;
  active: boolean;
  existingImages: string[];
  stlFile: File | null;
  imageFiles: File[];
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function parseFormData(formData: FormData): ProductFields | string {
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const price = Number(formData.get('price'));
  const category = String(formData.get('category') ?? 'encomenda');
  const active = formData.get('active') !== 'false';
  const stlEntry = formData.get('stl');
  const stlFile = stlEntry instanceof File && stlEntry.size > 0 ? stlEntry : null;
  const imageFiles = formData.getAll('images').filter((entry): entry is File => entry instanceof File && entry.size > 0);

  let existingImages: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get('existingImages') ?? '[]')) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((url) => typeof url === 'string')) return 'Lista de imagens inválida';
    existingImages = Array.from(new Set(parsed.map((url) => url.trim()).filter(Boolean)));
  } catch {
    return 'Lista de imagens inválida';
  }

  if (!name) return 'Nome do produto é obrigatório';
  if (!Number.isFinite(price) || price <= 0) return 'Preço inválido';
  if (!isCategory(category)) return 'Categoria inválida';
  if (stlFile && (!stlFile.name.toLowerCase().endsWith('.stl') || stlFile.size > MAX_STL_SIZE)) {
    return stlFile.size > MAX_STL_SIZE ? 'O arquivo STL deve ter no máximo 100 MB' : 'Apenas arquivos .stl são aceitos';
  }
  if (existingImages.length + imageFiles.length > MAX_IMAGES) return `Cadastre no máximo ${MAX_IMAGES} imagens`;
  for (const image of imageFiles) {
    if (!IMAGE_TYPES.has(image.type)) return `Formato de imagem não permitido: ${image.name}`;
    if (image.size > MAX_IMAGE_SIZE) return `A imagem ${image.name} ultrapassa 8 MB`;
  }

  return { name, description, price, category, active, existingImages, stlFile, imageFiles };
}

async function ensureImageBucket() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.storage.getBucket(IMAGE_BUCKET);
  if (data) {
    if (data.public) return null;
    const { error } = await supabase.storage.updateBucket(IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: MAX_IMAGE_SIZE,
      allowedMimeTypes: Array.from(IMAGE_TYPES),
    });
    return error;
  }
  const { error } = await supabase.storage.createBucket(IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_SIZE,
    allowedMimeTypes: Array.from(IMAGE_TYPES),
  });
  return error;
}

async function uploadImages(productId: string, files: File[]) {
  if (files.length === 0) return { urls: [] as string[], paths: [] as string[], error: null as string | null };
  const bucketError = await ensureImageBucket();
  if (bucketError) return { urls: [], paths: [], error: 'Não foi possível preparar o armazenamento das imagens' };

  const supabase = getSupabaseAdmin();
  const urls: string[] = [];
  const paths: string[] = [];
  for (const [index, file] of files.entries()) {
    const path = `products/${productId}/images/${Date.now()}-${index}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      if (paths.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(paths);
      return { urls: [], paths: [], error: `Erro ao enviar a imagem ${file.name}` };
    }
    paths.push(path);
    urls.push(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return { urls, paths, error: null };
}

async function uploadSTL(productId: string, file: File) {
  const path = `stl-files/${productId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await getSupabaseAdmin().storage.from(STL_BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: 'application/octet-stream',
    upsert: false,
  });
  return { path, error };
}

function revalidateProduct(productId: string) {
  revalidatePath('/stl', 'page');
  revalidatePath(`/stl/${productId}`, 'page');
  revalidatePath('/dashboard/products', 'page');
  revalidatePath(`/dashboard/products/${productId}`, 'page');
  revalidatePath(`/dashboard/products/${productId}/edit`, 'page');
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const fields = parseFormData(await request.formData());
    if (typeof fields === 'string') return errorResponse(fields);
    if (!fields.stlFile) return errorResponse('Arquivo STL é obrigatório');

    const supabase = getSupabaseAdmin();
    const { data: product, error: productError } = await supabase.from('products').insert({
      name: fields.name,
      description: fields.description,
      category: fields.category,
      type: 'digital',
      base_price: fields.price,
      active: fields.active,
    }).select('*').single();
    if (productError || !product) return errorResponse('Erro ao criar produto', 500);

    const uploadedImages = await uploadImages(product.id, fields.imageFiles);
    if (uploadedImages.error) {
      await supabase.from('products').delete().eq('id', product.id);
      return errorResponse(uploadedImages.error, 500);
    }

    const uploadedSTL = await uploadSTL(product.id, fields.stlFile);
    if (uploadedSTL.error) {
      if (uploadedImages.paths.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(uploadedImages.paths);
      await supabase.from('products').delete().eq('id', product.id);
      return errorResponse('Erro ao enviar o arquivo STL', 500);
    }

    const images = [...fields.existingImages, ...uploadedImages.urls];
    const { data: savedProduct, error: updateError } = await supabase.from('products').update({
      file_path: uploadedSTL.path,
      image_url: images[0] ?? null,
      images: images.length > 0 ? images : null,
    }).eq('id', product.id).select('*').single();

    if (updateError || !savedProduct) {
      await supabase.storage.from(STL_BUCKET).remove([uploadedSTL.path]);
      if (uploadedImages.paths.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(uploadedImages.paths);
      await supabase.from('products').delete().eq('id', product.id);
      return errorResponse('Erro ao finalizar o cadastro do produto', 500);
    }

    revalidateProduct(product.id);
    return NextResponse.json({ success: true, product: savedProduct as Product }, { status: 201 });
  } catch (error) {
    console.error('[stl-upload] create exception:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const formData = await request.formData();
    const productId = String(formData.get('productId') ?? '');
    if (!productId) return errorResponse('Produto não informado');
    const fields = parseFormData(formData);
    if (typeof fields === 'string') return errorResponse(fields);

    const supabase = getSupabaseAdmin();
    const { data: currentProduct } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
    if (!currentProduct) return errorResponse('Produto não encontrado', 404);
    if (currentProduct.type !== 'digital') return errorResponse('Este produto não é um arquivo STL');

    const uploadedImages = await uploadImages(productId, fields.imageFiles);
    if (uploadedImages.error) return errorResponse(uploadedImages.error, 500);

    let newSTLPath: string | null = null;
    if (fields.stlFile) {
      const uploadedSTL = await uploadSTL(productId, fields.stlFile);
      if (uploadedSTL.error) {
        if (uploadedImages.paths.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(uploadedImages.paths);
        return errorResponse('Erro ao enviar o novo arquivo STL', 500);
      }
      newSTLPath = uploadedSTL.path;
    }

    const images = [...fields.existingImages, ...uploadedImages.urls];
    const update = {
      name: fields.name,
      description: fields.description,
      category: fields.category,
      base_price: fields.price,
      active: fields.active,
      image_url: images[0] ?? null,
      images: images.length > 0 ? images : null,
      ...(newSTLPath ? { file_path: newSTLPath } : {}),
      updated_at: new Date().toISOString(),
    };
    const { data: savedProduct, error: updateError } = await supabase.from('products').update(update).eq('id', productId).select('*').single();
    if (updateError || !savedProduct) {
      if (newSTLPath) await supabase.storage.from(STL_BUCKET).remove([newSTLPath]);
      if (uploadedImages.paths.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(uploadedImages.paths);
      return errorResponse('Erro ao atualizar o produto STL', 500);
    }

    if (newSTLPath && currentProduct.file_path && !String(currentProduct.file_path).startsWith('http')) {
      await supabase.storage.from(STL_BUCKET).remove([currentProduct.file_path]);
    }
    revalidateProduct(productId);
    return NextResponse.json({ success: true, product: savedProduct as Product });
  } catch (error) {
    console.error('[stl-upload] update exception:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
}
