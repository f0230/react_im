import React, { useEffect, useState } from "react";
import clsx from "clsx";

const isMobileDevice = () =>
    typeof window !== "undefined" && window.innerWidth < 768;

const transparentPlaceholder =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export const OptimizedImage = ({
    src,
    srcWebp,
    mobileSrc,
    mobileSrcWebp,
    alt = "",
    className = "",
    width,
    height,
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedSrc, setSelectedSrc] = useState(null);
    const [selectedSrcWebp, setSelectedSrcWebp] = useState(null);

    useEffect(() => {
        const isMobile = isMobileDevice();
        setSelectedSrc(isMobile && mobileSrc ? mobileSrc : src);
        setSelectedSrcWebp(isMobile && mobileSrcWebp ? mobileSrcWebp : srcWebp);
    }, [src, srcWebp, mobileSrc, mobileSrcWebp]);

    if (!selectedSrc) return null;

    return (
        <picture>
            {selectedSrcWebp && (
                <source srcSet={selectedSrcWebp} type="image/webp" />
            )}
            <img
                src={selectedSrc || transparentPlaceholder}
                alt={alt}
                loading="lazy"
                decoding="async"
                width={width}
                height={height}
                onLoad={() => setIsLoaded(true)}
                className={clsx(
                    "object-cover transition-opacity duration-700 ease-out",
                    isLoaded ? "opacity-100" : "opacity-0",
                    className
                )}
            />
        </picture>
    );
};

export default OptimizedImage;
