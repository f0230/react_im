import React, { useState, useEffect } from 'react';

export const OptimizedImage = ({
    src,
    mobileSrc,
    alt,
    className = '',
    width,
    height
}) => {
    const [imageSrc, setImageSrc] = useState('/placeholder.png');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const imgToLoad = isMobile && mobileSrc ? mobileSrc : src;
        const img = new Image();
        img.src = imgToLoad;
        img.onload = () => setImageSrc(imgToLoad);
    }, [src, mobileSrc, isMobile]);

    return (
        <img
            src={imageSrc}
            alt={alt}
            loading="lazy"
            width={width}
            height={height}
            className={`${className} object-cover`}
        />
    );
};

export default OptimizedImage;
