import fs from 'fs/promises';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import { normalizeLegacyRecipeForRead } from '../lib/legacyRecipes.ts';
import { recipeSchema, type Recipe } from '../schema/recipeSchema.ts';

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { bytesValue: string }
  | { referenceValue: string }
  | { geoPointValue: { latitude: number; longitude: number } }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

type SignInResponse = {
  idToken?: string;
  error?: {
    message?: string;
  };
};

async function loadLocalEnvFiles() {
  const candidates = ['.env.local', '.env'];

  for (const filename of candidates) {
    const fullPath = path.join(process.cwd(), filename);
    try {
      const raw = await fs.readFile(fullPath, 'utf8');
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) return;

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        if (!(key in process.env)) {
          process.env[key] = value;
        }
      });
    } catch {
      // ignore missing env files
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeSlug(value: string | undefined, fallback: string) {
  const candidate = (value ?? '').trim();
  if (!candidate) return fallback;
  return candidate.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || fallback;
}

function decodeFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) {
    return {
      latitude: value.geoPointValue.latitude,
      longitude: value.geoPointValue.longitude,
    };
  }
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map((item) => decodeFirestoreValue(item));
  }
  if ('mapValue' in value) {
    const fields = value.mapValue.fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([key, entry]) => [key, decodeFirestoreValue(entry)]));
  }
  return null;
}

function decodeFirestoreDocument(document: FirestoreDocument) {
  const decoded = Object.fromEntries(
    Object.entries(document.fields ?? {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
  const id = document.name.split('/').pop() ?? 'unknown-document';
  return {
    id,
    data: decoded,
    createTime: document.createTime ?? null,
    updateTime: document.updateTime ?? null,
  };
}

async function signInWithEmailPassword(apiKey: string, email: string, password: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  const payload = (await response.json()) as SignInResponse;
  if (!response.ok || !payload.idToken) {
    throw new Error(payload.error?.message ?? 'Failed to authenticate with Firebase.');
  }

  return payload.idToken;
}

async function fetchRecipesViaClientSdk() {
  const app = initializeApp({
    apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  });

  const db = getFirestore(app);
  const snapshot = await getDocs(query(collection(db, 'recipes'), orderBy('title')));
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    data: docSnapshot.data(),
    createTime: null,
    updateTime: null,
  }));
}

async function fetchAllRecipeDocuments(projectId: string, databaseId: string, idToken: string) {
  const documents: FirestoreDocument[] = [];
  let pageToken: string | null = null;

  do {
    const searchParams = new URLSearchParams({ pageSize: '300' });
    if (pageToken) {
      searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/recipes?${searchParams.toString()}`,
      {
        headers: {
          authorization: `Bearer ${idToken}`,
          accept: 'application/json',
        },
      },
    );

    const payload = (await response.json()) as {
      documents?: FirestoreDocument[];
      nextPageToken?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(payload.error?.message ?? 'Failed to fetch recipes from Firestore.');
    }

    documents.push(...(payload.documents ?? []));
    pageToken = payload.nextPageToken ?? null;
  } while (pageToken);

  return documents;
}

async function main() {
  await loadLocalEnvFiles();

  const apiKey = requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
  const projectId = requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  const databaseId = process.env.FIREBASE_EXPORT_DATABASE_ID?.trim() || '(default)';

  const outputRoot = path.resolve(process.argv[2] ?? path.join(process.cwd(), 'backups', 'firestore-recipes'));
  const outputDir = path.join(outputRoot, timestampLabel());
  const recipesDir = path.join(outputDir, 'recipes');

  await fs.mkdir(recipesDir, { recursive: true });

  let decodedDocuments: Array<{ id: string; data: unknown; createTime: string | null; updateTime: string | null }>;

  try {
    decodedDocuments = await fetchRecipesViaClientSdk();
  } catch (clientError) {
    const email = process.env.FIREBASE_EXPORT_EMAIL?.trim();
    const password = process.env.FIREBASE_EXPORT_PASSWORD?.trim();
    if (!email || !password) {
      throw new Error(
        `Client SDK read failed and no export credentials are configured. Original error: ${
          (clientError as Error).message || String(clientError)
        }`,
      );
    }

    const idToken = await signInWithEmailPassword(apiKey, email, password);
    const documents = await fetchAllRecipeDocuments(projectId, databaseId, idToken);
    decodedDocuments = documents.map((document) => decodeFirestoreDocument(document));
  }

  const validRecipes: Recipe[] = [];
  const invalidDocuments: Array<{ id: string; errors: string[]; data: unknown }> = [];

  decodedDocuments.forEach((document) => {
    const parsed = recipeSchema.safeParse(normalizeLegacyRecipeForRead(document.data));
    if (parsed.success) {
      validRecipes.push(parsed.data);
      return;
    }

    invalidDocuments.push({
      id: document.id,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
      data: document.data,
    });
  });

  validRecipes.sort((a, b) => a.title.localeCompare(b.title, 'sv'));

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
