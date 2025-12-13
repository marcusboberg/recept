# Recept

A Firebase-backed recipe site. Recipes live as JSON documents in Firestore and the editor lets you paste or generate complete JSON blobs with inline validation and preview before saving.

## Core ideas
- **Firestore is the CMS.** The `recipes` collection stores every dish using the schema in `schema/recipeSchema.ts`.
- **Strict schema.** All edits pass through the shared Zod schema before they are persisted.
- **Editing = paste.** The editor surface supports manually pasting JSON, importing WordPress markup, or using the bundled ChatGPT prompt.
- **Trusted editors.** Only people med en hemlig kod (se `AUTH_CODES`) kan logga in och spara recept.

## Project structure
- `app/` – Next.js (App Router) pages plus API routes (OAuth + Firestore writes).
- `components/` – UI pieces including the editor, WordPress importer, tag/search filters, and recipe preview.
- `lib/` – Firestore helpers, auth/session utilities, templates, and recipe utilities.
- `schema/recipeSchema.ts` – Canonical Zod schema for recipe JSON.
- `scripts/validate-recipes.ts` – Optional schema validation for local JSON blobs.
- `.github/workflows/` – CI + deploy workflows.

## Running locally
```bash
npm install
npm run dev
```
Make sure the environment variables below are present in `.env.local`.

## Images
Set the `imageUrl` field in the JSON to any publicly reachable image (WordPress CDN, your own hosting, etc.). The current editor does not upload images; it only rewrites `imageUrl` if you paste a different link.

## Environment
| Variable | Description |
| --- | --- |
| `AUTH_CODES` | Comma-separated `name:code` pairs (ex: `marcus:abc123,friend:xyz789`) |
| `SESSION_SECRET` | Random string used to sign session cookies |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (use `\n` for newlines) |
| `NEXT_BASE_PATH` (optional) | Base path for static exports (set to `/recept` for GitHub Pages project sites) |

When deploying the static site (GitHub Pages), set `NEXT_STATIC_EXPORT=true` in the build step so Next.js emits `out/`. The Firebase env vars must also be available during the build so the recipes can be fetched at export time.

## CI
GitHub Actions installs deps, lints, builds, and exports the static site for GitHub Pages. Provide the same environment variables (including the Firebase credentials) as repository secrets so the build can read recipes while exporting.
