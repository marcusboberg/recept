const ALLOWED_IMPORT_HOSTS = new Set(['www.ica.se', 'ica.se', 'recept.marcusboberg.se']);
const ALLOWED_IMPORT_HOSTS_LABEL = 'www.ica.se, ica.se och recept.marcusboberg.se';
const MAX_IMPORT_HTML_BYTES = 2_500_000;
const MAX_IMPORT_REDIRECTS = 5;
const IMPORT_TIMEOUT_MS = 15_000;

export function getAllowedImportHostsLabel() {
  return ALLOWED_IMPORT_HOSTS_LABEL;
}

export function normalizeAllowedImportUrl(input: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Ogiltig URL. Kontrollera att du angivit hela adressen.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Endast http eller https är tillåtet.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URL med inloggningsuppgifter tillåts inte.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_IMPORT_HOSTS.has(hostname)) {
    throw new Error(`Endast recept från ${ALLOWED_IMPORT_HOSTS_LABEL} kan importeras.`);
  }

  return parsed;
}

async function readBodyWithLimit(response: Response, maxBytes: number) {
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
    if (total > maxBytes) {
      throw new Error(`HTML-svaret är för stort. Max tillåten storlek är ${Math.round(maxBytes / 1_000_000)} MB.`);
    }
    output += decoder.decode(value, { stream: true });
  }

  output += decoder.decode();
  return output;
}

export async function fetchAllowedImportHtml(input: string) {
  let currentUrl = normalizeAllowedImportUrl(input);

  for (let redirectCount = 0; redirectCount <= MAX_IMPORT_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMPORT_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl.toString(), {
        headers: {
          'user-agent': 'ReceptImporter/1.0 (+https://github.com/marcusboberg/recept)',
          accept: 'text/html,application/xhtml+xml',
        },
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error('Källsidan svarade med en omdirigering utan destination.');
        }
        currentUrl = normalizeAllowedImportUrl(new URL(location, currentUrl).toString());
        continue;
      }

      if (!response.ok) {
        throw new Error(`Kunde inte hämta sidan (${response.status}).`);
      }

      const html = await readBodyWithLimit(response, MAX_IMPORT_HTML_BYTES);
      return { html, url: currentUrl.toString() };
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
