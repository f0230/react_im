import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { useInView } from "react-intersection-observer";

const transparentPlaceholder =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

const isMobile = () =>
    typeof window !== "undefined" && window.innerWidth < 768;

export const OptimizedImage = ({
    src,
    srcWebp,
    mobileSrc,
    mobileSrcWebp,
    alt = "",
    className = "",
    width,
    height,
    sizes,
    onError,
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedSrc, setSelectedSrc] = useState(null);
    const [selectedSrcWebp, setSelectedSrcWebp] = useState(null);

    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    useEffect(() => {
        if (!inView) return;
        const useMobile = isMobile();
        setSelectedSrc(useMobile && mobileSrc ? mobileSrc : src);
        setSelectedSrcWebp(
            useMobile && mobileSrcWebp ? mobileSrcWebp : srcWebp
        );
    }, [inView, src, srcWebp, mobileSrc, mobileSrcWebp]);

    if (!inView || !selectedSrc) return <div ref={ref} style={{ height }} />;

    return (
        <picture ref={ref}>
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
                sizes={sizes}
                onLoad={() => setIsLoaded(true)}
                onError={onError}
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
