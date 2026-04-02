import {
  buildCategoryTypeRemovalPatch,
  fetchLiveRecipeDocuments,
  patchLiveRecipeDocument,
} from './lib/firestore-live-recipes.ts';

const shouldWrite = process.argv.includes('--write');

async function main() {
  const documents = await fetchLiveRecipeDocuments();
  const actions = documents
    .map((document) => {
      const raw = (document.data ?? {}) as Record<string, unknown>;
      const currentCategories = Array.isArray(raw.categories)
        ? raw.categories.filter((entry): entry is string => typeof entry === 'string')
        : [];
      const { patch, deleteFields } = buildCategoryTypeRemovalPatch(document);
      const hasLegacyType = deleteFields.length > 0;
      const categoriesChanged = JSON.stringify(currentCategories) !== JSON.stringify(patch.categories);
      const placeChanged = (typeof raw.categoryPlace === 'string' ? raw.categoryPlace : '') !== patch.categoryPlace;
      const baseChanged = (typeof raw.categoryBase === 'string' ? raw.categoryBase : '') !== patch.categoryBase;
      const drinkChanged = Boolean(raw.isDrink) !== patch.isDrink;

      if (!hasLegacyType && !categoriesChanged && !placeChanged && !baseChanged && !drinkChanged) {
        return null;
      }

      return {
        id: document.id,
        slug:
          typeof raw.slug === 'string' && raw.slug.trim().length > 0
            ? raw.slug.trim()
            : null,
        patch,
        deleteFields,
      };
    })
    .filter((action): action is NonNullable<typeof action> => Boolean(action));

  if (actions.length === 0) {
    console.log('No live recipes require categoryType migration.');
    return;
  }

  console.log(`${shouldWrite ? 'Applying' : 'Dry-run for'} ${actions.length} live recipe categoryType migration(s):`);
  actions.forEach((action) => {
    console.log(`- ${action.id}${action.slug ? ` (${action.slug})` : ''}`);
    console.log(`  patch=${JSON.stringify(action.patch)}`);
    if (action.deleteFields.length > 0) {
      console.log(`  delete=${action.deleteFields.join(', ')}`);
    }
  });

  if (!shouldWrite) {
    console.log('Run with --write to apply these patches.');
    return;
  }

  for (const action of actions) {
    await patchLiveRecipeDocument(action.id, action.patch, action.deleteFields);
  }

  console.log(`Applied ${actions.length} live recipe categoryType migration(s).`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
