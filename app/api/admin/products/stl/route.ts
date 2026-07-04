import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = auth.slice(7);
    const supabase = getSupabaseAdmin();

    // Verify admin role
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const images = formData.getAll('images') as File[];
    const stlFile = formData.get('stl') as File;

    // Validation
    if (!name || !description || !price || !images.length || !stlFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!stlFile.name.endsWith('.stl')) {
      return NextResponse.json(
        { error: 'File must be .stl format' },
        { status: 400 }
      );
    }

    if (stlFile.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be < 50MB' },
        { status: 400 }
      );
    }

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([
        {
          name,
          description,
          price,
          type: 'digital',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (productError || !product) {
      console.error('[stl-upload] Product creation error:', productError);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    // Upload STL file
    const stlPath = `stl-files/${product.id}/${stlFile.name}`;
    const stlBuffer = await stlFile.arrayBuffer();

    const { error: stlUploadError } = await supabase.storage
      .from('products')
      .upload(stlPath, stlBuffer, { contentType: 'application/octet-stream', upsert: false });

    if (stlUploadError) {
      // Rollback product if file upload fails
      await supabase.from('products').delete().eq('id', product.id);
      console.error('[stl-upload] STL upload error:', stlUploadError);
      return NextResponse.json(
        { error: 'Failed to upload STL file' },
        { status: 500 }
      );
    }

    // Update product with file_path
    const { error: updateError } = await supabase
      .from('products')
      .update({ file_path: stlPath })
      .eq('id', product.id);

    if (updateError) {
      console.error('[stl-upload] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save file path' },
        { status: 500 }
      );
    }

    // Upload images (create multiple product_images entries)
    const imageUploads = await Promise.all(
      images.map(async (imgFile, idx) => {
        const imgPath = `products/${product.id}/images/${idx}-${imgFile.name}`;
        const imgBuffer = await imgFile.arrayBuffer();

        const { error: imgError } = await supabase.storage
          .from('products')
          .upload(imgPath, imgBuffer, { contentType: imgFile.type, upsert: false });

        if (imgError) return null;

        const { data: imgRecord } = await supabase
          .from('product_images')
          .insert([{ product_id: product.id, image_url: imgPath, display_order: idx }])
          .select()
          .single();

        return imgRecord;
      })
    );

    if (!imageUploads.some(img => img)) {
      // At least one image failed, but continue
      console.warn('[stl-upload] Some images failed to upload');
    }

    return NextResponse.json({
      success: true,
      productId: product.id,
    });
  } catch (error) {
    console.error('[stl-upload] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
