// src/components/ResponsiveImage.jsx
import React, { useState } from 'react';
import clsx from 'clsx';

const ResponsiveImage = ({ image, alt = '', className = '', ...props }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    if (!image || !image.img) return null;

    return (
        <picture>
            {image.sources?.map((source, i) => (
                <source key={i} {...source} />
            ))}
            <img
                {...image.img}
                {...props}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                className={clsx(
                    'object-cover transition-opacity duration-700 ease-out',
                    isLoaded ? 'opacity-100' : 'opacity-0',
                    className
                )}
            />
        </picture>
    );
};

export default ResponsiveImage;
