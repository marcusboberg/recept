import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { doc, getDoc, getFirestore, type Firestore } from 'firebase/firestore';
import { resolveRecipeSlugByHistory } from '@/lib/slugHistory';

type ShareRecipe = {
  title: string;
  description?: string;
  imageUrl?: string;
  slug: string;
};

type RecipeDoc = {
  title?: string;
  description?: string;
  imageUrl?: string;
};

let app: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getFirestoreServer(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error('Firebase configuration missing; set NEXT_PUBLIC_FIREBASE_* env vars.');
  }
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  }
  firestoreInstance = getFirestore(app);
  return firestoreInstance;
}

export async function loadShareRecipe(slug: string): Promise<ShareRecipe | null> {
  if (!slug) return null;
  try {
    const db = getFirestoreServer();
    const snap = await getDoc(doc(db, 'recipes', slug));
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as RecipeDoc;
    return {
      title: data.title ?? slug,
      description: data.description,
      imageUrl: data.imageUrl,
      slug,
    };
  } catch (error) {
    console.error('Failed to load recipe from Firestore', slug, error);
    return null;
  }
}

export async function resolveShareRecipeWithSlug(slug: string): Promise<{
  recipe: ShareRecipe | null;
  canonicalSlug: string | null;
}> {
  const direct = await loadShareRecipe(slug);
  if (direct) {
    return { recipe: direct, canonicalSlug: slug };
  }

  try {
    const db = getFirestoreServer();
    const resolved = await resolveRecipeSlugByHistory(db, slug);
    if (!resolved || resolved === slug) {
      return { recipe: null, canonicalSlug: null };
    }
    const fallback = await loadShareRecipe(resolved);
    return { recipe: fallback, canonicalSlug: fallback ? resolved : null };
  } catch (error) {
    console.error('Failed to resolve recipe slug history', slug, error);
    return { recipe: null, canonicalSlug: null };
  }
}
