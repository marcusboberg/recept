import fs from 'fs/promises';
import path from 'path';
import { getApps, initializeApp } from 'firebase/app';
import { collection, deleteField, doc, getDocs, getFirestore, orderBy, query, updateDoc } from 'firebase/firestore';
import { deriveCategoriesArray } from '../../lib/categories.ts';
import { normalizeLegacyRecipeForRead } from '../../lib/legacyRecipes.ts';
import { recipeSchema, type Recipe } from '../../schema/recipeSchema.ts';

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

export type LiveRecipeDocument = {
  id: string;
  data: unknown;
  createTime: string | null;
  updateTime: string | null;
};

export type InvalidLiveRecipeDocument = LiveRecipeDocument & {
  slug: string | null;
  errors: string[];
};

export async function loadLocalEnvFiles() {
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

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
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

function encodeFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => encodeFirestoreValue(entry)),
      },
    };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, encodeFirestoreValue(entry)]),
        ),
      },
    };
  }

  return { stringValue: String(value) };
}

function decodeFirestoreDocument(document: FirestoreDocument): LiveRecipeDocument {
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

function getProjectConfig() {
  return {
    apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    databaseId: process.env.FIREBASE_EXPORT_DATABASE_ID?.trim() || '(default)',
    authEmail: requireEnv('FIREBASE_EXPORT_EMAIL'),
    authPassword: requireEnv('FIREBASE_EXPORT_PASSWORD'),
  };
}

function getClientFirebaseApp() {
  return getApps()[0] ??
    initializeApp({
      apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
      authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
      projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
    });
}

async function fetchRecipesViaClientSdk() {
  const app = getClientFirebaseApp();
  const db = getFirestore(app);
  const snapshot = await getDocs(query(collection(db, 'recipes'), orderBy('title')));
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    data: docSnapshot.data(),
    createTime: null,
    updateTime: null,
  }));
}

async function patchRecipeViaClientSdk(documentId: string, patch: Record<string, unknown>, deleteFields: string[] = []) {
  const app = getClientFirebaseApp();
  const db = getFirestore(app);
  await updateDoc(doc(db, 'recipes', documentId), {
    ...patch,
    ...Object.fromEntries(deleteFields.map((field) => [field, deleteField()])),
  });
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

  return documents.map((document) => decodeFirestoreDocument(document));
}

export async function fetchLiveRecipeDocuments() {
  await loadLocalEnvFiles();

  try {
    return await fetchRecipesViaClientSdk();
  } catch (clientError) {
    const { apiKey, projectId, databaseId, authEmail, authPassword } = getProjectConfig();
    const idToken = await signInWithEmailPassword(apiKey, authEmail, authPassword);
    try {
      return await fetchAllRecipeDocuments(projectId, databaseId, idToken);
    } catch (restError) {
      throw new Error(
        `Client SDK read failed: ${(clientError as Error).message || String(clientError)}. REST fallback failed: ${
          (restError as Error).message || String(restError)
        }`,
      );
    }
  }
}

export function validateLiveRecipeDocuments(documents: LiveRecipeDocument[]) {
  const validRecipes: Recipe[] = [];
  const invalidDocuments: InvalidLiveRecipeDocument[] = [];

  documents.forEach((document) => {
    const raw = (document.data ?? {}) as Record<string, unknown>;
    if ('categoryType' in raw) {
      invalidDocuments.push({
        ...document,
        slug: typeof raw.slug === 'string' ? raw.slug : null,
        errors: ['categoryType: Legacyfältet categoryType måste migreras bort'],
      });
      return;
    }

    const parsed = recipeSchema.safeParse(normalizeLegacyRecipeForRead(document.data));
    if (parsed.success) {
      validRecipes.push(parsed.data);
      return;
    }

    invalidDocuments.push({
      ...document,
      slug: typeof raw.slug === 'string' ? raw.slug : null,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    });
  });

  validRecipes.sort((a, b) => a.title.localeCompare(b.title, 'sv'));

  return {
    validRecipes,
    invalidDocuments,
  };
}

export async function patchLiveRecipeDocument(documentId: string, patch: Record<string, unknown>, deleteFields: string[] = []) {
  await loadLocalEnvFiles();
  try {
    await patchRecipeViaClientSdk(documentId, patch, deleteFields);
    return;
  } catch (clientError) {
    let config: ReturnType<typeof getProjectConfig>;
    try {
      config = getProjectConfig();
    } catch (configError) {
      throw new Error(
        `Client SDK write failed for "${documentId}": ${
          (clientError as Error).message || String(clientError)
        }. REST fallback requires FIREBASE_EXPORT_EMAIL/FIREBASE_EXPORT_PASSWORD.`,
      );
    }
    const { apiKey, projectId, databaseId, authEmail, authPassword } = config;
    const idToken = await signInWithEmailPassword(apiKey, authEmail, authPassword);
    const searchParams = new URLSearchParams();

    [...Object.keys(patch), ...deleteFields].forEach((fieldPath) => {
      searchParams.append('updateMask.fieldPaths', fieldPath);
    });

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/recipes/${documentId}?${searchParams.toString()}`,
      {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${idToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          fields: Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, encodeFirestoreValue(value)])),
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(
        payload.error?.message ??
          `Failed to patch Firestore document "${documentId}" after client SDK fallback: ${
            (clientError as Error).message || String(clientError)
          }`,
      );
    }
  }
}

export function buildCategoryTypeRemovalPatch(document: LiveRecipeDocument) {
  const raw = (document.data ?? {}) as Record<string, unknown>;
  const legacyType = typeof raw.categoryType === 'string' ? raw.categoryType.trim() : '';
  const normalizedInput = normalizeLegacyRecipeForRead(document.data) as Record<string, unknown>;
  const normalized = recipeSchema.parse({
    ...normalizedInput,
    categories: deriveCategoriesArray({
      categoryPlace:
        typeof normalizedInput.categoryPlace === 'string' ? normalizedInput.categoryPlace : undefined,
      categoryBase:
        typeof normalizedInput.categoryBase === 'string' ? normalizedInput.categoryBase : undefined,
      recipeKind: typeof normalizedInput.recipeKind === 'string' ? normalizedInput.recipeKind : undefined,
      isDrink: normalizedInput.isDrink === true,
      categories: Array.isArray(normalizedInput.categories)
        ? normalizedInput.categories.filter((entry): entry is string => typeof entry === 'string')
        : [],
    }).filter((entry) => entry !== legacyType),
  });

  return {
    patch: {
      categoryPlace: normalized.categoryPlace,
      categoryBase: normalized.categoryBase,
      recipeKind: normalized.recipeKind,
      isDrink: normalized.isDrink,
      categories: normalized.categories,
      updatedAt: new Date().toISOString(),
    },
    deleteFields: legacyType || 'categoryType' in raw ? ['categoryType'] : [],
  };
}
