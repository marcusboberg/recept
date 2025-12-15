import { NextResponse } from 'next/server';

function normalizeUrl(input: string) {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Endast http eller https är tillåtet.');
    }
    return parsed.toString();
  } catch (error) {
    throw new Error('Ogiltig URL. Kontrollera att du angivit hela adressen.');
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const { url } = body;
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Saknar url-parameter.' }, { status: 400 });
    }

    const targetUrl = normalizeUrl(url);

    const response = await fetch(targetUrl, {
      headers: {
        'user-agent': 'ReceptImporter/1.0 (+https://github.com/marcusboberg/recept)',
        accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Kunde inte hämta sidan (${response.status}).` }, { status: 400 });
    }

    const html = await response.text();
    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
