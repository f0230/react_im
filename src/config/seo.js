import { contactInfo } from './branding.js';

export const SITE_URL = 'https://grupodte.com';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

export const publicRoutes = [
  { path: '/', changefreq: 'weekly', priority: 1 },
  { path: '/servicios', changefreq: 'monthly', priority: 0.9 },
  { path: '/nosotros', changefreq: 'monthly', priority: 0.8 },
  { path: '/contacto', changefreq: 'monthly', priority: 0.8 },
  { path: '/dte', changefreq: 'monthly', priority: 0.7 },
  { path: '/tyc', changefreq: 'yearly', priority: 0.3 },
  { path: '/politica-privacidad', changefreq: 'yearly', priority: 0.3 },
];

export const noIndexPathPrefixes = [
  '/admin',
  '/api',
  '/brief',
  '/colors',
  '/complete-profile',
  '/dashboard',
  '/invite',
  '/meet',
  '/registro',
];

export const robotsDisallowPathPrefixes = [
  '/admin',
  '/api',
  '/brief',
  '/complete-profile',
  '/dashboard',
  '/invite',
  '/registro',
];

const canonicalAliases = {
  '/contacto': '/contacto',
  '/nosotros': '/nosotros',
  '/terminos-y-condiciones': '/tyc',
};

export const normalizePathname = (pathname = '/') => {
  const rawPath = String(pathname || '/').split('?')[0].split('#')[0] || '/';
  const lowerPath = rawPath.startsWith('/') ? rawPath.toLowerCase() : `/${rawPath.toLowerCase()}`;
  const withoutTrailingSlash = lowerPath.replace(/\/+$/, '') || '/';
  return canonicalAliases[withoutTrailingSlash] || withoutTrailingSlash;
};

export const absoluteUrl = (value = '/') => {
  if (!value) return SITE_URL;

  try {
    const url = new URL(value, SITE_URL);
    const normalizedPath = normalizePathname(url.pathname);
    return `${SITE_URL}${normalizedPath === '/' ? '' : normalizedPath}`;
  } catch {
    const normalizedPath = normalizePathname(value);
    return `${SITE_URL}${normalizedPath === '/' ? '' : normalizedPath}`;
  }
};

export const shouldNoIndexPath = (pathname = '/') => {
  const normalizedPath = normalizePathname(pathname);
  return noIndexPathPrefixes.some((prefix) => (
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  ));
};

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Grupo DTE',
  alternateName: 'DTE',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: contactInfo.email,
  telephone: contactInfo.phone,
  areaServed: [
    { '@type': 'Country', name: 'Uruguay' },
    { '@type': 'Place', name: 'Latinoamérica' },
  ],
  sameAs: [
    'https://www.instagram.com/grupodte',
    'https://www.linkedin.com/company/grupodte',
  ],
};

export const professionalServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Grupo DTE',
  url: SITE_URL,
  image: DEFAULT_OG_IMAGE,
  email: contactInfo.email,
  telephone: contactInfo.phone,
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'UY',
  },
  areaServed: organizationSchema.areaServed,
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Grupo DTE',
  url: SITE_URL,
  inLanguage: 'es-UY',
};

export const breadcrumbSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});
