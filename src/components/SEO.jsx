// src/components/SEO.jsx
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://grupodte.com';
const DEFAULT_OG = `${SITE_URL}/og-default.jpg`;

export default function SEO({
    title,
    description,
    image = DEFAULT_OG,
    url,
    type = 'website',
}) {
    const fullUrl = url || SITE_URL;

    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content="Grupo DTE" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:url" content={fullUrl} />

            {/* Twitter / X */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            <link rel="canonical" href={fullUrl} />
        </Helmet>
    );
}
