export const DEFAULT_RECIPE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-labelledby="title desc">
      <title id="title">Recipe image placeholder</title>
      <desc id="desc">Subtle gradient background used when a recipe image is missing</desc>
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="50%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#g)" />
      <g fill="#94a3b8" opacity="0.55">
        <circle cx="120" cy="160" r="70" />
        <circle cx="360" cy="140" r="110" />
        <circle cx="600" cy="200" r="90" />
        <circle cx="520" cy="420" r="120" />
        <circle cx="220" cy="400" r="100" />
      </g>
    </svg>
  `);
