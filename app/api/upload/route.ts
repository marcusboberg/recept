import { promises as fs } from 'fs';
import path from 'path';
import { fetchGitHubUser, isUserAllowed, putFile } from '@/lib/github';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const UPLOAD_DIR = 'public/images/uploads';
const PUBLIC_PREFIX = '/images/uploads';
const hasGitHubConfig = Boolean(process.env.GITHUB_OWNER && process.env.GITHUB_REPO && process.env.GITHUB_TOKEN);
const isDev = process.env.NODE_ENV !== 'production';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (buffer.byteLength === 0) return '';
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function buildFilename(extension: string) {
  const uid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${uid}${extension}`;
}

export async function POST(request: Request) {
  if (!hasGitHubConfig && !isDev) {
    return jsonResponse({ error: 'Image upload requires GitHub configuration. Set GITHUB_* env vars.' }, 500);
  }

  let useGitHub = hasGitHubConfig;
  if (useGitHub) {
    const user = await fetchGitHubUser();
    if (!user || !isUserAllowed(user)) {
      if (isDev) {
        useGitHub = false;
      } else {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
    }
  }

  let file: Blob & { name?: string } | null = null;
  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    if (entry && typeof (entry as Blob).arrayBuffer === 'function') {
      file = entry as Blob & { name?: string };
    }
  } catch (error) {
    return jsonResponse({ error: 'Invalid form data' }, 400);
  }

  if (!file) {
    return jsonResponse({ error: 'Missing file' }, 400);
  }
  if (!ALLOWED_MIME_TYPES[file.type]) {
    return jsonResponse({ error: 'Only JPG, PNG, or WebP images are allowed' }, 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return jsonResponse({ error: 'Image too large (max 4MB)' }, 413);
  }

  const extension = ALLOWED_MIME_TYPES[file.type];
  const filename = buildFilename(extension);
  const filePath = `${UPLOAD_DIR}/${filename}`;
  const publicUrl = `${PUBLIC_PREFIX}/${filename}`;
  const buffer = await file.arrayBuffer();

  if (useGitHub) {
    const contentBase64 = arrayBufferToBase64(buffer);
    try {
      await putFile({
        path: filePath,
        message: `Upload recipe image: ${filename}`,
        contentBase64,
      });
    } catch (error) {
      return jsonResponse({ error: (error as Error).message ?? 'Unable to upload image' }, 500);
    }
  } else {
    const uploadsDir = path.join(process.cwd(), UPLOAD_DIR);
    const localPath = path.join(uploadsDir, filename);
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(localPath, Buffer.from(buffer));
    } catch (error) {
      return jsonResponse({ error: (error as Error).message ?? 'Unable to save image locally' }, 500);
    }
  }

  return jsonResponse({ url: publicUrl, path: filePath, mode: useGitHub ? 'github' : 'local' });
}
