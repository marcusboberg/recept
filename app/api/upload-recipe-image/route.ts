import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { convertRecipeImageToWebp, normalizeRecipeImageSlug } from '@/lib/serverRecipeImage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const token = process.env.RECIPE_IMAGES_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'RECIPE_IMAGES_READ_WRITE_TOKEN saknas i miljön.' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Saknar bildfil.' }, { status: 400 });
    }

    const slug = normalizeRecipeImageSlug(formData.get('slug'));
    const image = await convertRecipeImageToWebp(file);
    const pathname = `recipes/${slug}/hero.webp`;
    const webpFile = new Blob([Uint8Array.from(image.buffer)], { type: 'image/webp' });
    const blob = await put(pathname, webpFile, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'image/webp',
      token,
    });

    return NextResponse.json({
      url: blob.url,
      width: image.width,
      height: image.height,
      size: image.size,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
