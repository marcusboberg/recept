const BASE_CATEGORY_ICON_BY_SLUG: Record<string, string> = {
  agg: 'fa-solid fa-egg',
  anka: 'fa-solid fa-duck',
  apel: 'fa-solid fa-apple-whole',
  avokado: 'fa-solid fa-avocado',
  bacon: 'fa-solid fa-bacon',
  bar: 'fa-solid fa-wine-bottle',
  bonor: 'fa-solid fa-seedling',
  brod: 'fa-solid fa-bread-slice',
  choklad: 'fa-solid fa-candy-bar',
  citron: 'fa-solid fa-lemon',
  fisk: 'fa-solid fa-fish',
  flask: 'fa-solid fa-bacon',
  frukt: 'fa-solid fa-apple-whole',
  getost: 'fa-solid fa-cheese',
  grodor: 'fa-solid fa-frog',
  gronsaker: 'fa-solid fa-carrot',
  hallon: 'fa-solid fa-berry',
  jordgubbar: 'fa-solid fa-strawberry',
  kaffe: 'fa-solid fa-mug-hot',
  kallskuret: 'fa-solid fa-sandwich',
  korv: 'fa-solid fa-hotdog',
  kyckling: 'fa-solid fa-turkey',
  kott: 'fa-solid fa-steak',
  kottfars: 'fa-solid fa-bowl-rice',
  lamm: 'fa-solid fa-cow',
  lax: 'fa-solid fa-fish',
  mjolk: 'fa-solid fa-glass-water',
  mozzarella: 'fa-solid fa-cheese',
  ost: 'fa-solid fa-cheese',
  paprika: 'fa-solid fa-pepper-hot',
  pasta: 'fa-solid fa-wheat-awn',
  potatis: 'fa-solid fa-potato',
  rkor: 'fa-solid fa-shrimp',
  rakor: 'fa-solid fa-shrimp',
  ris: 'fa-solid fa-bowl-rice',
  saffran: 'fa-solid fa-spa',
  sallad: 'fa-solid fa-leaf',
  skaldjur: 'fa-solid fa-shrimp',
  sill: 'fa-solid fa-fish',
  skinka: 'fa-solid fa-drumstick-bite',
  svamp: 'fa-solid fa-mushroom',
  tomat: 'fa-solid fa-tomato',
  tonfisk: 'fa-solid fa-fish',
  torsk: 'fa-solid fa-fish',
  umami: 'fa-solid fa-mushroom',
  valnotter: 'fa-solid fa-seedling',
  vegetariskt: 'fa-solid fa-carrot',
  vilt: 'fa-solid fa-deer',
};

const BASE_CATEGORY_ICON_RULES: Array<{ pattern: RegExp; iconClass: string }> = [
  { pattern: /fisk|sill|lax|torsk|tonfisk/, iconClass: 'fa-solid fa-fish' },
  { pattern: /skaldjur|raka|rkor|scampi|mussla|ostra/, iconClass: 'fa-solid fa-shrimp' },
  { pattern: /kyckling|hons/, iconClass: 'fa-solid fa-turkey' },
  { pattern: /kallskuret|chark/, iconClass: 'fa-solid fa-sandwich' },
  { pattern: /f[aä]rs/, iconClass: 'fa-solid fa-bowl-rice' },
  { pattern: /kott|n[oö]t|h[oö]grev|entrec[oô]te|ox|biff|kalv/, iconClass: 'fa-solid fa-steak' },
  { pattern: /fl[aä]sk|bacon|skinka/, iconClass: 'fa-solid fa-bacon' },
  { pattern: /ost|chevre|brie|mozzarella|parmesan/, iconClass: 'fa-solid fa-cheese' },
  { pattern: /potatis/, iconClass: 'fa-solid fa-potato' },
  { pattern: /tomat/, iconClass: 'fa-solid fa-tomato' },
  { pattern: /paprika|chili/, iconClass: 'fa-solid fa-pepper-hot' },
  { pattern: /citron|lime|apelsin/, iconClass: 'fa-solid fa-lemon' },
  { pattern: /frukt|apple|apel|p[aä]ron/, iconClass: 'fa-solid fa-apple-whole' },
  { pattern: /b[oö]n|linser|kik[aä]rt/, iconClass: 'fa-solid fa-seedling' },
  { pattern: /gr[oö]nsak|morot|rotfrukt/, iconClass: 'fa-solid fa-carrot' },
  { pattern: /vegetar|vegansk/, iconClass: 'fa-solid fa-carrot' },
  { pattern: /svamp/, iconClass: 'fa-solid fa-mushroom' },
  { pattern: /umami/, iconClass: 'fa-solid fa-mushroom' },
  { pattern: /sallad|bladgr[oö]nt/, iconClass: 'fa-solid fa-leaf' },
  { pattern: /pasta|mj[oö]l|spannm[aå]l/, iconClass: 'fa-solid fa-wheat-awn' },
  { pattern: /ris/, iconClass: 'fa-solid fa-bowl-rice' },
  { pattern: /kaffe|te/, iconClass: 'fa-solid fa-mug-hot' },
  { pattern: /vin|bubbel|drink|cocktail|bar/, iconClass: 'fa-solid fa-wine-glass' },
  { pattern: /s[oö]tt|choklad|godis|dessert/, iconClass: 'fa-solid fa-candy-bar' },
];

function normalizeCategoryKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function getBaseCategoryIconClass(name: string) {
  const slug = normalizeCategoryKey(name);

  if (BASE_CATEGORY_ICON_BY_SLUG[slug]) {
    return BASE_CATEGORY_ICON_BY_SLUG[slug];
  }

  for (const rule of BASE_CATEGORY_ICON_RULES) {
    if (rule.pattern.test(slug)) {
      return rule.iconClass;
    }
  }

  return 'fa-solid fa-utensils';
}
