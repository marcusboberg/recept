/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const corsHeaders = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'POST, OPTIONS',
	'access-control-allow-headers': 'content-type',
};

export default {
	async fetch(request: Request): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		try {
			const { url } = (await request.json()) as { url?: string };
			if (!url || typeof url !== 'string') {
				return new Response(JSON.stringify({ error: 'Saknar url-parameter.' }), { status: 400, headers: corsHeaders });
			}

			let parsed: URL;
			try {
				parsed = new URL(url);
			} catch {
				return new Response(JSON.stringify({ error: 'Ogiltig URL.' }), { status: 400, headers: corsHeaders });
			}

			if (!['http:', 'https:'].includes(parsed.protocol)) {
				return new Response(JSON.stringify({ error: 'Endast http/https tillåtet.' }), { status: 400, headers: corsHeaders });
			}

			const upstream = await fetch(parsed.toString(), {
				headers: {
					'user-agent': 'Mozilla/5.0 (compatible; ReceptImporter/1.0; +https://recept2.marcusboberg.se)',
					accept: 'text/html,application/xhtml+xml',
					'accept-language': 'sv-SE,sv;q=0.9,en;q=0.8',
				},
				redirect: 'follow',
			});

			const upstreamBody = await upstream.text();

			if (!upstream.ok) {
				return new Response(
					JSON.stringify({
						error: `Kunde inte hämta sidan (${upstream.status} ${upstream.statusText}).`,
						details: upstreamBody.slice(0, 1000),
					}),
					{ status: upstream.status, headers: corsHeaders },
				);
			}

			const html = upstreamBody;
			return new Response(JSON.stringify({ html }), {
				headers: { 'content-type': 'application/json', ...corsHeaders },
			});
		} catch (error) {
			return new Response(JSON.stringify({ error: (error as Error).message }), { status: 400, headers: corsHeaders });
		}
	},
} satisfies ExportedHandler<Env>;
