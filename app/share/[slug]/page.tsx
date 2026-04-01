import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { resolveShareRecipeWithSlug } from '@/lib/firebaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const defaultSiteUrl = 'http://localhost:3000';
const rawSiteUrl = process.env.NEXT_PUBLIC_APP_URL ?? defaultSiteUrl;
const siteUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl : `https://${rawSiteUrl}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { recipe, canonicalSlug } = await resolveShareRecipeWithSlug(slug);
  if (!recipe) {
    return {
      title: 'Recept saknas',
      description: 'Den här delningslänken kunde inte laddas.',
    };
  }

  const title = recipe.title || 'Recept';
  const description = recipe.description || 'Ett recept från recept.marcusboberg.se';
  const canonical = `${siteUrl}/share/${canonicalSlug ?? recipe.slug}`;
  const shareImage = `${siteUrl}/api/share/${canonicalSlug ?? recipe.slug}`;

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
          url: shareImage,
          width: 1080,
          height: 1920,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [shareImage],
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { recipe, canonicalSlug } = await resolveShareRecipeWithSlug(slug);

  if (!recipe) {
    notFound();
  }

  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(`/share/${canonicalSlug}`);
  }

  const targetHref = `/#/recipe/${canonicalSlug ?? slug}`;

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
