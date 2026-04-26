import sharp from 'sharp';

export const RECIPE_IMAGE_MAX_SIZE = 1600;
export const RECIPE_IMAGE_WEBP_QUALITY = 68;
export const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
export const FALLBACK_RECIPE_IMAGE_SLUG = 'new-recipe-slug';

export type ConvertedRecipeImage = {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
};

export function normalizeRecipeImageSlug(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return FALLBACK_RECIPE_IMAGE_SLUG;
  }

  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || FALLBACK_RECIPE_IMAGE_SLUG
  );
}

export async function convertRecipeImageToWebp(file: File): Promise<ConvertedRecipeImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Välj en bildfil.');
  }

  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('Bilden är för stor. Max 12 MB.');
  }

  const source = Buffer.from(await file.arrayBuffer());
  const buffer = await sharp(source)
    .rotate()
    .resize({
      width: RECIPE_IMAGE_MAX_SIZE,
      height: RECIPE_IMAGE_MAX_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: RECIPE_IMAGE_WEBP_QUALITY, effort: 5 })
    .toBuffer();
  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    width: metadata.width ?? RECIPE_IMAGE_MAX_SIZE,
    height: metadata.height ?? RECIPE_IMAGE_MAX_SIZE,
    size: buffer.byteLength,
  };
}
