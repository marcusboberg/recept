import { collection, getDocs, limit, query, where, type Firestore } from 'firebase/firestore';

export async function resolveRecipeSlugByHistory(db: Firestore, slug: string): Promise<string | null> {
  if (!slug) return null;
  const recipesRef = collection(db, 'recipes');
  const slugQuery = query(recipesRef, where('slugHistory', 'array-contains', slug), limit(1));
  const snapshot = await getDocs(slugQuery);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as { slug?: string };
  return data.slug ?? docSnap.id ?? null;
}
