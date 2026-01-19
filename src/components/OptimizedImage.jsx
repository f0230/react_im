import React, { useMemo } from 'react';

const isMobileDevice = () => typeof window !== 'undefined' && window.innerWidth < 768;

export const OptimizedImage = ({
    src,
    mobileSrc,
    alt,
    className = '',
    width,
    height,
    loading = 'lazy',
    fetchpriority,
    decoding = 'async'
}) => {
    // Calcular src una vez, sin estado para evitar re-renders y flash
    const imageSrc = useMemo(() => {
        return isMobileDevice() && mobileSrc ? mobileSrc : src;
    }, [src, mobileSrc]);

    return (
        <img
            src={imageSrc}
            alt={alt}
            loading={loading}
            width={width}
            height={height}
            decoding={decoding}
            fetchpriority={fetchpriority}
            className={`${className} object-cover`}
        />
    );
};

export default OptimizedImage;