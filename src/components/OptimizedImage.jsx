import React, { useEffect, useState } from 'react';

const isMobileDevice = () => typeof window !== 'undefined' && window.innerWidth < 768;

export const OptimizedImage = ({ src, mobileSrc, alt, className = '', width, height }) => {
    const [imageSrc, setImageSrc] = useState('/placeholder.png');

    useEffect(() => {
        const selectedSrc = isMobileDevice() && mobileSrc ? mobileSrc : src;
        setImageSrc(selectedSrc);
    }, [src, mobileSrc]);

    return (
        <img
            src={imageSrc}
            alt={alt}
            loading="lazy"
            width={width}
            height={height}
            decoding="async"
            className={`${className} object-cover`}
        />
    );
};

export default OptimizedImage;