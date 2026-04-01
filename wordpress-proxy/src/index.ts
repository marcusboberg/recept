const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const allowedHosts = new Set(['www.ica.se', 'ica.se', 'recept.marcusboberg.se']);
const allowedHostsLabel = 'www.ica.se, ica.se och recept.marcusboberg.se';
const maxHtmlBytes = 2_500_000;
const maxRedirects = 5;
const timeoutMs = 15_000;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders },
  });
}

function normalizeAllowedImportUrl(input: string) {
  let parsed: URL;

  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Ogiltig URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Endast http/https tillåtet.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URL med inloggningsuppgifter tillåts inte.');
  }

  if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error(`Endast recept från ${allowedHostsLabel} kan importeras.`);
  }

  return parsed;
}

async function readBodyWithLimit(response: Response) {
  if (!response.body) {
    return await response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let output = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxHtmlBytes) {
      throw new Error(`HTML-svaret är för stort. Max tillåten storlek är ${Math.round(maxHtmlBytes / 1_000_000)} MB.`);
    }
    output += decoder.decode(value, { stream: true });
  }

  output += decoder.decode();
  return output;
}

async function fetchAllowedImportHtml(input: string) {
  let currentUrl = normalizeAllowedImportUrl(input);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const upstream = await fetch(currentUrl.toString(), {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; ReceptImporter/1.0; +https://recept.marcusboberg.se)',
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'sv-SE,sv;q=0.9,en;q=0.8',
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get('location');
        if (!location) {
          throw new Error('Källsidan svarade med en omdirigering utan destination.');
        }
        currentUrl = normalizeAllowedImportUrl(new URL(location, currentUrl).toString());
        continue;
      }

      const upstreamBody = await readBodyWithLimit(upstream);

      if (!upstream.ok) {
        return {
          ok: false,
          status: upstream.status,
          payload: {
            error: `Kunde inte hämta sidan (${upstream.status} ${upstream.statusText}).`,
            details: upstreamBody.slice(0, 1000),
          },
        };
      }

      return {
        ok: true,
        status: 200,
        payload: { html: upstreamBody },
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Hämtningen tog för lång tid och avbröts.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('För många omdirigeringar vid hämtning av källsidan.');
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const { url } = (await request.json()) as { url?: string };
      if (!url || typeof url !== 'string') {
        return jsonResponse({ error: 'Saknar url-parameter.' }, 400);
      }

      const result = await fetchAllowedImportHtml(url);
      return jsonResponse(result.payload, result.status);
    } catch (error) {
      return jsonResponse({ error: (error as Error).message }, 400);
    }
  },
} satisfies ExportedHandler<Env>;
