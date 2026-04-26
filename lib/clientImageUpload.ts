'use client';

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from '@/lib/firebaseClient';

type CompressImageOptions = {
  maxSize?: number;
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

export async function compressImageToWebp(file: File, options: CompressImageOptions = {}): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Välj en bildfil.');
  }

  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const decoded = await decodeImage(file);
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

  return {
    blob,
    width,
    height,
    size: blob.size,
  };
}

export async function uploadRecipeImage(file: File, slug: string): Promise<UploadedRecipeImage> {
  const compressed = await compressImageToWebp(file);
  const storage = getFirebaseStorage();
  const safeSlug = toRecipeImageSlug(slug);
  const imageRef = ref(storage, `recipes/${safeSlug}/hero.webp`);

  await uploadBytes(imageRef, compressed.blob, {
    contentType: 'image/webp',
    cacheControl: 'public,max-age=31536000',
  });

  const url = await getDownloadURL(imageRef);

  return {
    url,
    width: compressed.width,
    height: compressed.height,
    size: compressed.size,
  };
}
