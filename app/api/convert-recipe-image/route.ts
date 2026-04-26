import { NextResponse } from 'next/server';
import { convertRecipeImageToWebp, normalizeRecipeImageSlug } from '@/lib/serverRecipeImage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Saknar bildfil.' }, { status: 400 });
    }

    const slug = normalizeRecipeImageSlug(formData.get('slug'));
    const image = await convertRecipeImageToWebp(file);

    return new NextResponse(Uint8Array.from(image.buffer), {
      headers: {
        'Content-Disposition': `attachment; filename="${slug}-smaller.webp"`,
        'Content-Length': String(image.size),
        'Content-Type': 'image/webp',
        'X-Image-Height': String(image.height),
        'X-Image-Size': String(image.size),
        'X-Image-Width': String(image.width),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
