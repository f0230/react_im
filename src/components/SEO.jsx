// src/components/SEO.jsx
import { Helmet } from 'react-helmet-async';
import { DEFAULT_OG_IMAGE, absoluteUrl } from '@/config/seo';

export default function SEO({
    title,
    description,
    image = DEFAULT_OG_IMAGE,
    url,
    type = 'website',
    robots = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    structuredData = [],
}) {
    const fullUrl = absoluteUrl(url || '/');
    const imageUrl = image?.startsWith('http') ? image : absoluteUrl(image || DEFAULT_OG_IMAGE);
    const jsonLdItems = Array.isArray(structuredData) ? structuredData : [structuredData];

    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="robots" content={robots} />

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content="Grupo DTE" />
            <meta property="og:locale" content="es_UY" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:type" content="image/jpeg" />
            <meta property="og:url" content={fullUrl} />

            {/* Twitter / X */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imageUrl} />

            <link rel="canonical" href={fullUrl} />

            {jsonLdItems.filter(Boolean).map((item, index) => (
                <script key={`json-ld-${index}`} type="application/ld+json">
                    {JSON.stringify(item)}
                </script>
            ))}
        </Helmet>
    );
}
