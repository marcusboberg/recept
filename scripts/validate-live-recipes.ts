import { fetchLiveRecipeDocuments, validateLiveRecipeDocuments } from './lib/firestore-live-recipes.ts';

async function main() {
  const documents = await fetchLiveRecipeDocuments();
  const { validRecipes, invalidDocuments } = validateLiveRecipeDocuments(documents);

  if (invalidDocuments.length > 0) {
    console.error(`Found ${invalidDocuments.length} invalid live recipe document(s):`);
    invalidDocuments.forEach((document) => {
      console.error(`- ${document.id}${document.slug ? ` (${document.slug})` : ''}`);
      document.errors.forEach((error) => {
        console.error(`  • ${error}`);
      });
    });
    process.exit(1);
  }

  console.log(`Validated ${validRecipes.length} live recipe(s) from Firestore.`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
