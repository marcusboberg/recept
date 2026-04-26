'use client';

type CompressImageOptions = {
  maxSize?: number;
  onProgress?: (progress: RecipeImageUploadProgress) => void;
  quality?: number;
};

type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
  size: number;
};

type UploadedRecipeImage = {
  url: string;
  width: number;
  height: number;
  size: number;
};

export type RecipeImageUploadStep =
  | 'validate'
  | 'decode'
  | 'resize'
  | 'convert'
  | 'upload'
  | 'downloadUrl';

type RecipeImageUploadProgress = {
  step: RecipeImageUploadStep;
};

type UploadRecipeImageOptions = {
  onProgress?: (progress: RecipeImageUploadProgress) => void;
};

type SmallerRecipeImage = {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  size: number;
};

const DEFAULT_MAX_SIZE = 800;
const DEFAULT_QUALITY = 0.75;
const FALLBACK_SLUG = 'new-recipe-slug';

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  await image.decode();
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(objectUrl),
  };
}

function toRecipeImageSlug(slug: string): string {
  const normalized = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || FALLBACK_SLUG;
}

async function isWebpBlob(blob: Blob): Promise<boolean> {
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (header.length < 12) return false;
  const riff = String.fromCharCode(...header.slice(0, 4));
  const webp = String.fromCharCode(...header.slice(8, 12));
  return riff === 'RIFF' && webp === 'WEBP';
}

export async function compressImageToWebp(file: File, options: CompressImageOptions = {}): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Välj en bildfil.');
  }

  options.onProgress?.({ step: 'decode' });
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const decoded = await decodeImage(file);

  options.onProgress?.({ step: 'resize' });
  const scale = Math.min(1, maxSize / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    decoded.close?.();
    throw new Error('Kunde inte förbereda bilden.');
  }

  context.drawImage(decoded.source, 0, 0, width, height);
  decoded.close?.();

  options.onProgress?.({ step: 'convert' });
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
          return;
        }
        reject(new Error('Kunde inte konvertera bilden till WebP.'));
      },
      'image/webp',
      quality,
    );
  });

  if (!(await isWebpBlob(blob))) {
    throw new Error('Din webbläsare sparade bilden som PNG i stället för WebP. Använd serverkonverteringen i stället.');
  }

  return {
    blob,
    width,
    height,
    size: blob.size,
  };
}

export async function uploadRecipeImage(file: File, slug: string, options: UploadRecipeImageOptions = {}): Promise<UploadedRecipeImage> {
  options.onProgress?.({ step: 'validate' });
  if (!file.type.startsWith('image/')) {
    throw new Error('Välj en bildfil.');
  }
  const safeSlug = toRecipeImageSlug(slug);

  options.onProgress?.({
    step: 'upload',
  });

  const formData = new FormData();
  formData.set('file', file);
  formData.set('slug', safeSlug);

  const response = await fetch('/api/upload-recipe-image', {
    method: 'POST',
    body: formData,
  });

  const result = (await response.json().catch(() => null)) as {
    error?: string;
    height?: number;
    size?: number;
    url?: string;
    width?: number;
  } | null;

  if (!response.ok || !result?.url) {
    throw new Error(result?.error ?? 'Kunde inte ladda upp bilden till Vercel Blob.');
  }

  options.onProgress?.({ step: 'downloadUrl' });

  return {
    url: result.url,
    width: result.width ?? 0,
    height: result.height ?? 0,
    size: result.size ?? 0,
  };
}

export async function createSmallerRecipeImage(file: File, slug: string, options: UploadRecipeImageOptions = {}): Promise<SmallerRecipeImage> {
  options.onProgress?.({ step: 'validate' });
  if (!file.type.startsWith('image/')) {
    throw new Error('Välj en bildfil.');
  }

  options.onProgress?.({ step: 'upload' });
  const safeSlug = toRecipeImageSlug(slug);
  const formData = new FormData();
  formData.set('file', file);
  formData.set('slug', safeSlug);

  const response = await fetch('/api/convert-recipe-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(result?.error ?? 'Kunde inte skapa en mindre WebP.');
  }

  options.onProgress?.({ step: 'convert' });
  const blob = await response.blob();
  if (!(await isWebpBlob(blob))) {
    throw new Error('Servern skapade inte en giltig WebP-fil.');
  }

  options.onProgress?.({ step: 'downloadUrl' });
  return {
    blob,
    filename: `${safeSlug}-smaller.webp`,
    width: Number(response.headers.get('X-Image-Width')) || 0,
    height: Number(response.headers.get('X-Image-Height')) || 0,
    size: Number(response.headers.get('X-Image-Size')) || blob.size,
  };
}
