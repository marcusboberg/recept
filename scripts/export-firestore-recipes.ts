import fs from 'fs/promises';
import path from 'path';
import { fetchLiveRecipeDocuments, loadLocalEnvFiles, requireEnv, validateLiveRecipeDocuments } from './lib/firestore-live-recipes.ts';

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeSlug(value: string | undefined, fallback: string) {
  const candidate = (value ?? '').trim();
  if (!candidate) return fallback;
  return candidate.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || fallback;
}

async function main() {
  await loadLocalEnvFiles();
  const projectId = requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  const databaseId = process.env.FIREBASE_EXPORT_DATABASE_ID?.trim() || '(default)';
  const outputRoot = path.resolve(process.argv[2] ?? path.join(process.cwd(), 'backups', 'firestore-recipes'));
  const outputDir = path.join(outputRoot, timestampLabel());
  const recipesDir = path.join(outputDir, 'recipes');

  await fs.mkdir(recipesDir, { recursive: true });

  const documents = await fetchLiveRecipeDocuments();
  const { validRecipes, invalidDocuments } = validateLiveRecipeDocuments(documents);

  for (const recipe of validRecipes) {
    const filename = `${safeSlug(recipe.slug, recipe.title || 'recipe')}.json`;
    await fs.writeFile(path.join(recipesDir, filename), JSON.stringify(recipe, null, 2) + '\n', 'utf8');
  }

  const backupPayload = {
    exportedAt: new Date().toISOString(),
    projectId,
    databaseId,
    count: validRecipes.length,
    invalidCount: invalidDocuments.length,
    recipes: validRecipes,
  };

  await fs.writeFile(path.join(outputDir, 'all-recipes.json'), JSON.stringify(backupPayload, null, 2) + '\n', 'utf8');

  if (invalidDocuments.length > 0) {
    await fs.writeFile(
      path.join(outputDir, 'invalid-documents.json'),
      JSON.stringify({ invalidDocuments }, null, 2) + '\n',
      'utf8',
    );
  }

  console.log(`Backed up ${validRecipes.length} recipe(s) to ${outputDir}`);
  if (invalidDocuments.length > 0) {
    console.log(`Skipped ${invalidDocuments.length} invalid document(s). See invalid-documents.json`);
  }
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
