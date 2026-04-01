import { NextResponse } from 'next/server';
import { fetchAllowedImportHtml, normalizeAllowedImportUrl } from '@/lib/importSources';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const { url } = body;
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Saknar url-parameter.' }, { status: 400 });
    }

    const normalizedUrl = normalizeAllowedImportUrl(url).toString();
    const { html } = await fetchAllowedImportHtml(normalizedUrl);
    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
