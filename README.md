# Recept

A Firebase-backed recipe site. Recipes live as JSON documents in Firestore and the editor lets you paste or generate complete JSON blobs with inline validation and preview before saving.

## Core ideas
- **Firestore is the CMS.** The `recipes` collection stores every dish using the schema in `schema/recipeSchema.ts`.
- **Strict schema.** All edits pass genom den delade Zod-schemat innan de sparas.
- **Editing = paste.** Editorn låter dig klistra in JSON, importera WordPress-HTML eller använda den färdiga ChatGPT-prompten.
- **Firebase Auth.** Endast personer med ett konto i Firebase Authentication kan logga in och spara recept.

## Project structure
- `app/` – Next.js (App Router) pages. Data laddas på klienten via Firebase SDK.
- `components/` – UI-komponenter (editor, WordPress-import, sök/taggar, preview, receptvisning).
- `lib/` – Firestore-klient + admin helpers, templates och recipe utilities.
- `schema/recipeSchema.ts` – Canonical Zod schema for recipe JSON.
- `scripts/validate-recipes.ts` – Optional schema validation for local JSON blobs.
- `.github/workflows/` – CI + deploy workflows.

## Running locally
```bash
npm install
npm run dev
```
Make sure the environment variables below are present in `.env.local`.

## Free backups
- In the studio, authenticated users can click `Ladda ner backup` to download all recipes as a JSON file directly from Firestore.
- For a file-based local backup, run `npm run backup:recipes`.
- The script writes a timestamped backup under `backups/firestore-recipes/` with both `all-recipes.json` and one file per recipe.
- The backup script can read via the Firebase client SDK when project rules allow it. If not, set `FIREBASE_EXPORT_EMAIL` and `FIREBASE_EXPORT_PASSWORD` for REST fallback.

## Live data checks
- `npm run validate:live-recipes` validates the live `recipes` collection in Firestore against the shared schema.
- `npm run repair:live-recipes` prints the pending live migration that removes legacy `categoryType` fields and recalculates `categories`.
- `npm run repair:live-recipes -- --write` applies that live migration with merge updates plus field deletion.
- `npm run lint` may still print a `baseline-browser-mapping` staleness notice even on the latest package version; that warning reflects upstream Baseline dataset age, not necessarily an outdated local install.
- `npm run check:live` runs the blocking live validation plus workflow tests intended for CI/release gates.

## Images
Set the `imageUrl` field in the JSON to any publicly reachable image (WordPress CDN, your own hosting, etc.). Studio can also upload a local image from the recipe editor. Uploaded images are compressed in the browser to WebP at max 800 px before being sent to `/api/upload-recipe-image`, stored in Vercel Blob under `recipes/{slug}/hero.webp`, and written back to `imageUrl`.

Image uploads require a Vercel Blob store connected with the `RECIPE_IMAGES_READ_WRITE_TOKEN` environment variable.

## Environment
Add the Firebase client config so webbläsaren kan logga in och prata med Firestore:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain (ex: `project.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket URL |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | (Optional) GA4 measurement ID |

For SSR deployment on Vercel, keep `NEXT_STATIC_EXPORT=false` (or unset). Configure the same `NEXT_PUBLIC_FIREBASE_*` variables in Vercel project settings so both client features and server-rendered share routes can access Firebase.

## CI
GitHub Actions installs deps, validates JSON, lints on PRs, and builds in SSR mode. Keep Firebase-related secrets available in repository settings for CI builds.
