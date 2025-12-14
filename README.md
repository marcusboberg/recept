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

## Images
Set the `imageUrl` field in the JSON to any publicly reachable image (WordPress CDN, your own hosting, etc.). The current editor does not upload images; it only rewrites `imageUrl` if you paste a different link.

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

When deploying the static site (GitHub Pages), set `NEXT_STATIC_EXPORT=true` i byggsteget så Next.js exporterar `out/`. Samma `NEXT_PUBLIC_FIREBASE_*` variabler måste finnas i CI (GitHub Secrets) eftersom klienten annars inte kan ansluta till Firebase Auth/Firestore.

## CI
GitHub Actions installs deps, lints, builds, and exports the static site for GitHub Pages. Provide the same environment variables (including the Firebase credentials) as repository secrets so the build can read recipes while exporting.
