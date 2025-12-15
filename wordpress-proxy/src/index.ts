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

			const response = await fetch(parsed.toString(), {
				headers: {
					'user-agent': 'ReceptImporter/1.0 (+https://recept2.marcusboberg.se)',
					accept: 'text/html,application/xhtml+xml',
				},
				redirect: 'follow',
			});

			if (!response.ok) {
				return new Response(JSON.stringify({ error: `Kunde inte hämta sidan (${response.status}).` }), { status: 400, headers: corsHeaders });
			}

			const html = await response.text();
			return new Response(JSON.stringify({ html }), {
				headers: { 'content-type': 'application/json', ...corsHeaders },
			});
		} catch (error) {
			return new Response(JSON.stringify({ error: (error as Error).message }), { status: 400, headers: corsHeaders });
		}
	},
} satisfies ExportedHandler<Env>;
