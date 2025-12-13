import { getDb } from '@/lib/firebaseAdmin';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

const COLLECTION_NAME = 'recipes';

function parseDoc(data: FirebaseFirestore.DocumentData): Recipe {
  const parsed = recipeSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
  }
  return parsed.data;
}

export async function loadAllRecipes(): Promise<Recipe[]> {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION_NAME).orderBy('title').get();
  return snapshot.docs.map((doc) => parseDoc(doc.data()));
}

export async function loadRecipe(slug: string): Promise<Recipe> {
  const db = getDb();
  const doc = await db.collection(COLLECTION_NAME).doc(slug).get();
  if (!doc.exists) {
    throw new Error('Recipe not found');
  }
  return parseDoc(doc.data()!);
}

export async function listRecipeSlugs(): Promise<string[]> {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION_NAME).get();
  return snapshot.docs.map((doc) => doc.id);
}
