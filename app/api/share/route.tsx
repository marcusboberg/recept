'use server';

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Recept';
  const subtitle = searchParams.get('subtitle') || '';
  const image = searchParams.get('image');

  const width = 1080;
  const height = 1920;

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
