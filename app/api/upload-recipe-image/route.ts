import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

    if (file.type !== 'image/webp') {
      return NextResponse.json({ error: 'Bilden måste vara WebP.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Bilden är för stor. Max 5 MB.' }, { status: 400 });
    }

    const slug = normalizeSlug(formData.get('slug'));
    const pathname = `recipes/${slug}/hero.webp`;
    const blob = await put(pathname, file, {
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
