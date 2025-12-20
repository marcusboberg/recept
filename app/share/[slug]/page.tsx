import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { doc, getDoc, getFirestore, type Firestore } from 'firebase/firestore';

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';
export const dynamic = 'force-static';
export const dynamicParams = false;
export const revalidate = 0;

type RecipeDoc = {
  title?: string;
  description?: string;
  imageUrl?: string;
};

type RecipeFile = {
  title: string;
  description?: string;
  imageUrl?: string;
  slug: string;
};

const defaultSiteUrl = 'http://localhost:3000';
const rawSiteUrl = process.env.NEXT_PUBLIC_APP_URL ?? defaultSiteUrl;
const siteUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;
const fallbackImage = `${siteUrl}/images/recipes/new-recipe.jpg`;

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

function getFirestoreServer(): Firestore {
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

async function loadRecipe(slug: string): Promise<RecipeFile | null> {
  if (!slug) return null;
  if (isStaticExport) return null;
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
    console.error('Failed to load recipe for share page', slug, error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const recipe = await loadRecipe(params.slug);
  if (!recipe) {
    return {
      title: 'Recept saknas',
      description: 'Den här delningslänken kunde inte laddas.',
    };
  }

  const title = recipe.title || 'Recept';
  const description = recipe.description || 'Ett recept från recept.marcusboberg.se';
  const hero = recipe.imageUrl || fallbackImage;
  const canonical = `${siteUrl}/share/${recipe.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      siteName: 'Recept',
      images: [
        {
          url: hero,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [hero],
    },
  };
}

export default async function SharePage({ params }: { params: { slug: string } }) {
  const recipe = await loadRecipe(params.slug);

  if (!recipe) {
    if (!isStaticExport) {
      notFound();
    }
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '32px',
          background: '#0b0b0b',
          color: '#f8fafc',
          fontFamily: "'Montserrat Alternates', system-ui, sans-serif",
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: 28, marginBottom: 12, fontWeight: 700 }}>Recept saknas</h1>
          <p style={{ color: '#cbd5e1', marginBottom: 16 }}>
            Den här delningslänken kunde inte laddas i statisk export. Öppna appen för att se receptet.
          </p>
          <a
            href="/#/recipes"
            style={{
              display: 'inline-flex',
              padding: '12px 18px',
              borderRadius: 999,
              background: '#2563eb',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Till recepten
          </a>
        </div>
      </div>
    );
  }

  const targetHref = `/#/recipe/${params.slug}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px',
        background: '#f5f3ee',
        color: '#1f2937',
        fontFamily: "'Montserrat Alternates', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.12)',
          padding: '32px 28px',
          textAlign: 'center',
        }}
      >
        <p style={{ letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 14, color: '#6b7280' }}>Recept</p>
        <h1 style={{ fontSize: 28, margin: '12px 0 8px', fontWeight: 700, lineHeight: 1.2 }}>{recipe.title}</h1>
        {recipe.description ? (
          <p style={{ color: '#4b5563', lineHeight: 1.5, marginBottom: 16 }}>{recipe.description}</p>
        ) : null}
        <a
          href={targetHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: 999,
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 12px 24px rgba(37, 99, 235, 0.28)',
          }}
        >
          Öppna receptet
          <span aria-hidden="true">→</span>
        </a>
        <p style={{ marginTop: 14, fontSize: 13, color: '#6b7280' }}>Du skickades hit för att få en snygg länk-förhandsvisning.</p>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Klicka på knappen ovan om du inte omdirigeras automatiskt.
        </p>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(function(){window.location.href='${targetHref}';}, 400);`,
        }}
      />
    </div>
  );
}
