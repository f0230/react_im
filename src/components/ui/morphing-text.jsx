import { useCallback, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

const morphTime = 1.5;
const cooldownTime = 0.5;

const useMorphingText = (texts) => {
    const textIndexRef = useRef(0);
    const morphRef = useRef(0);
    const cooldownRef = useRef(0);
    const timeRef = useRef(new Date());

    const text1Ref = useRef(null);
    const text2Ref = useRef(null);

    const setStyles = useCallback((fraction) => {
        const current1 = text1Ref.current;
        const current2 = text2Ref.current;
        if (!current1 || !current2) return;

        const safeFraction = Math.max(fraction, 0.0001);
        current2.style.filter = `blur(${Math.min(8 / safeFraction - 8, 100)}px)`;
        current2.style.opacity = `${Math.pow(safeFraction, 0.4) * 100}%`;

        const invertedFraction = Math.max(1 - safeFraction, 0.0001);
        current1.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`;
        current1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`;

        current1.textContent = texts[textIndexRef.current % texts.length];
        current2.textContent = texts[(textIndexRef.current + 1) % texts.length];
    }, [texts]);

    const doMorph = useCallback(() => {
        morphRef.current -= cooldownRef.current;
        cooldownRef.current = 0;

        let fraction = morphRef.current / morphTime;

        if (fraction > 1) {
            cooldownRef.current = cooldownTime;
            fraction = 1;
        }

        setStyles(fraction);

        if (fraction === 1) {
            textIndexRef.current += 1;
        }
    }, [setStyles]);

    const doCooldown = useCallback(() => {
        morphRef.current = 0;
        const current1 = text1Ref.current;
        const current2 = text2Ref.current;

        if (current1 && current2) {
            current2.style.filter = 'none';
            current2.style.opacity = '100%';
            current1.style.filter = 'none';
            current1.style.opacity = '0%';
        }
    }, []);

    useEffect(() => {
        let animationFrameId;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            const newTime = new Date();
            const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
            timeRef.current = newTime;

            cooldownRef.current -= dt;

            if (cooldownRef.current <= 0) doMorph();
            else doCooldown();
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [doMorph, doCooldown]);

    return { text1Ref, text2Ref };
};

const Texts = ({ texts }) => {
    const { text1Ref, text2Ref } = useMorphingText(texts);

    return (
        <>
            <span
                className="absolute inset-x-0 top-0 m-auto inline-block w-full whitespace-nowrap"
                ref={text1Ref}
            />
            <span
                className="absolute inset-x-0 top-0 m-auto inline-block w-full whitespace-nowrap"
                ref={text2Ref}
            />
        </>
    );
};

const SvgFilters = () => (
    <svg id="filters" className="hidden" preserveAspectRatio="xMidYMid slice">
        <defs>
            <filter id="threshold">
                <feColorMatrix
                    in="SourceGraphic"
                    type="matrix"
                    values={`1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 255 -140`}
                />
            </filter>
        </defs>
    </svg>
);

const MorphingText = ({ texts, className }) => (
    <div
        className={cn(
            'relative mx-auto h-16 w-full max-w-screen-md overflow-hidden text-center font-sans text-[40pt] font-bold leading-none [filter:url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]',
            className
        )}
    >
        <Texts texts={texts} />
        <SvgFilters />
    </div>
);

export { MorphingText };
