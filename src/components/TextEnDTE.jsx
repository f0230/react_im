// TextEnDTE.jsx optimizado
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from 'react-i18next';

gsap.registerPlugin(ScrollTrigger);

const SimultaneousWords = () => {
    const { t, i18n } = useTranslation();
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const titleWords = gsap.utils.toArray('.title-word');
        const paragraphWords = gsap.utils.toArray('.paragraph-word');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse',
                markers: false,
            },
        });

        tl.fromTo(
            titleWords,
            { x: '100%', opacity: 0 },
            {
                x: '0%',
                opacity: 1,
                stagger: 0.08,
                ease: 'power3.out',
                duration: 0.6,
            }
        ).fromTo(
            paragraphWords,
            { x: '100%', opacity: 0 },
            {
                x: '0%',
                opacity: 1,
                stagger: 0.04,
                ease: 'power3.out',
                duration: 0.6,
            },
            '-=0.3'
        );

        return () => {
            tl.kill();
        };
    }, [i18n.language]);

    const title = t('textEnDte.title');
    const paragraph = t('textEnDte.paragraph');

    const titleWords = title.split(' ');
    const paragraphWords = paragraph.split(' ');

    return (
        <section
            className="relative w-full flex justify-center items-center border-y-2 border-black overflow-hidden py-10 md:py-16"
            aria-label={t('textEnDte.aria')}
        >
            <article
                ref={containerRef}
                className="w-full max-w-[1100px] px-4 md:px-6 flex flex-col justify-center items-start"
            >
                <header>
                    <h2 className="text-[30px] md:text-3xl font-bold font-product flex flex-wrap gap-2 mb-4">
                        {titleWords.map((word, i) => (
                            <span key={i} className="title-word inline-block whitespace-nowrap">
                                {word}
                            </span>
                        ))}
                    </h2>
                </header>
                <section>
                    <p className="text-[17px] md:text-[17px] font-product font-normal flex flex-wrap gap-1 leading-none">
                        {paragraphWords.map((word, i) => (
                            <span key={i} className="paragraph-word inline-block whitespace-nowrap">
                                {word}
                            </span>
                        ))}
                    </p>
                </section>
            </article>
        </section>
    );
};

export default SimultaneousWords;
