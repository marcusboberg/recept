'use server';

import path from 'path';
import { promises as fs } from 'fs';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

type RecipeFile = {
  title: string;
  description?: string;
  imageUrl?: string;
  slug: string;
};

async function loadRecipe(slug: string): Promise<RecipeFile | null> {
  const filePath = path.join(process.cwd(), 'data', 'recipes', `${slug}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as RecipeFile;
  } catch (error) {
    console.error('Failed to load recipe for share card', slug, error);
    return null;
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = await loadRecipe(slug);
  if (!recipe) {
    return new Response('Recipe not found', { status: 404 });
  }

  const width = 1080;
  const height = 1920;
  const title = recipe.title ?? 'Recept';
  const subtitle = recipe.description ?? '';
  const image = recipe.imageUrl;

  const backgroundStyle = image
    ? {
        backgroundImage: `url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: 'linear-gradient(180deg, #0f172a, #1e293b)',
      };

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          position: 'relative',
          color: '#f8fafc',
          fontFamily: "'Fraunces', 'Montserrat Alternates', 'Georgia', serif",
          ...backgroundStyle,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(0deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.08) 75%, rgba(0,0,0,0) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 48,
            padding: '12px 18px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.16)',
            color: '#e2e8f0',
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Recept
        </div>
        <div
          style={{
            position: 'relative',
            padding: '56px 48px 72px',
            textAlign: 'center',
            width: '100%',
            maxWidth: 840,
            display: 'flex',
            flexDirection: 'column',
            gap: subtitle ? 28 : 16,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              textShadow: '0 8px 26px rgba(0,0,0,0.45)',
              wordBreak: 'break-word',
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 42,
                fontWeight: 500,
                letterSpacing: 0.6,
                color: '#e2e8f0',
                textShadow: '0 6px 18px rgba(0,0,0,0.35)',
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      width,
      height,
    },
  );
}
