// src/components/SEO.jsx
import { Helmet } from 'react-helmet-async';

export default function SEO({
    title,
    description,
    image,
    url,
}) {
    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:url" content={url} />
            <link rel="canonical" href={url} />
        </Helmet>
    );
}
