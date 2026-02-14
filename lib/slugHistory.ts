import { collection, getDocs, query, where, type Firestore } from 'firebase/firestore';

type SlugLookupDoc = {
  slug?: string;
  updatedAt?: string;
};

function parseTimestamp(value?: string): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function resolveRecipeSlugByHistory(db: Firestore, slug: string): Promise<string | null> {
  if (!slug) return null;
  const recipesRef = collection(db, 'recipes');
  const slugQuery = query(recipesRef, where('slugHistory', 'array-contains', slug));
  const snapshot = await getDocs(slugQuery);
  if (snapshot.empty) return null;

  const candidates = snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as SlugLookupDoc;
      const candidateSlug = data.slug?.trim() || docSnap.id;
      return {
        slug: candidateSlug,
        updatedAt: parseTimestamp(data.updatedAt),
      };
    })
    .filter((candidate) => candidate.slug.length > 0);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.updatedAt - a.updatedAt || a.slug.localeCompare(b.slug, 'sv'));

  if (candidates.length > 1 && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[slugHistory] Multiple recipes matched old slug. Selecting most recently updated candidate.',
      { slug, candidates: candidates.map((candidate) => candidate.slug) },
    );
  }

  return candidates[0]?.slug ?? null;
}
