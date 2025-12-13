# Recept

A minimal Git-backed recipe site. JSON files in `data/recipes` are the single source of truth. The UI is optimized for pasting complete JSON blobs, validating them, previewing the result, and committing directly to GitHub.

## Core ideas
- **Git is the CMS.** Recipes live as JSON files on the `main` branch.
- **Strict schema.** All recipes must pass the Zod schema in `schema/recipeSchema.ts`.
- **Editing = paste.** The editor is a Monaco-based JSON surface with inline validation and a live preview.
- **Two trusted editors.** GitHub OAuth is used to restrict writes to the users listed in `ALLOWED_USERS`.

## Project structure
- `app/` – Next.js (App Router) pages for list, detail, edit, and new recipe flows plus GitHub + auth API route handlers.
- `components/` – UI pieces including the Monaco editor wrapper, tag/search filters, and recipe preview.
- `lib/` – Data loaders, GitHub helpers, templates, and recipe utilities.
- `schema/recipeSchema.ts` – Canonical Zod schema for recipe JSON.
- `data/recipes/` – Canonical recipe JSON files (one file per recipe).
- `scripts/validate-recipes.ts` – Schema validation used locally and in CI.
- `.github/workflows/ci.yml` – CI that validates JSON, lints, and builds.

## Running locally
```bash
npm install
npm run dev
```

## Uploading images
- Use the new “Recipe image” uploader in the editor to pick a JPG/PNG/WebP.
- Files are committed via the GitHub Contents API to `public/images/uploads`, and the returned `/images/uploads/...` URL is injected into `imageUrl`.
- Because uploads land in Git, you need the usual `GITHUB_*` env vars plus `ALLOWED_USERS` configured just like recipe commits.
- Local previews might show the placeholder until you pull the new file or a fresh deploy finishes.

## Environment
Set these for GitHub-backed reads/writes:
- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` (default `main`)
- `GITHUB_TOKEN` with `repo` scope
- `ALLOWED_USERS` comma-separated GitHub usernames allowed to commit

Without the env vars, the site falls back to the checked-in JSON files for read-only browsing.

## CI
`npm run validate` ensures every JSON file in `data/recipes` matches the schema. GitHub Actions runs validation, linting, and build on every push/PR to `main`.
