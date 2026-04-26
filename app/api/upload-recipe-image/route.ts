import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isWebp(bytes: Uint8Array) {
  if (bytes.length < 12) return false;
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  return riff === 'RIFF' && webp === 'WEBP';
}

function normalizeSlug(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return 'new-recipe-slug';
  }

  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'new-recipe-slug';
}

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

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Bilden är för stor. Max 5 MB.' }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isWebp(bytes)) {
      return NextResponse.json(
        { error: 'Bilden kunde inte konverteras till WebP i webbläsaren. Prova en JPG eller PNG och försök igen.' },
        { status: 400 },
      );
    }

    const slug = normalizeSlug(formData.get('slug'));
    const pathname = `recipes/${slug}/hero.webp`;
    const webpFile = new Blob([bytes], { type: 'image/webp' });
    const blob = await put(pathname, webpFile, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'image/webp',
      token,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
