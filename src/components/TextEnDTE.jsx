// TextEnDTE.jsx optimizado
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from 'react-i18next';
import logoDte from '../assets/LOGODTE.svg';

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

    const [titlePrefix = '', titleLogo = ''] = title.split(' ');
    const normalizedTitlePrefix = titlePrefix
        ? `${titlePrefix.charAt(0).toUpperCase()}${titlePrefix.slice(1).toLowerCase()}`
        : '';
    const paragraphBlocks = paragraph
        .split('\n\n')
        .map((block) => block.trim())
        .filter(Boolean);

    return (
        <section
            className="relative w-full flex justify-center items-center border-y-2 border-black overflow-hidden py-10 md:py-16"
            aria-label={t('textEnDte.aria')}
        >
            <article
                ref={containerRef}
                className="w-full px-6 md:px-8 lg:px-10 flex flex-col justify-center items-start"
            >
                <header>
                    <h2 className="mb-4 flex flex-wrap items-center gap-3 text-[30px] font-bold font-product md:text-[36px]">
                        <span className="title-word inline-block whitespace-nowrap font-normal">
                            {normalizedTitlePrefix}
                        </span>
                        <img
                            src={logoDte}
                            alt={titleLogo}
                            className="title-word h-[28px] w-auto md:h-[34px]"
                            draggable="false"
                        />
                    </h2>
                </header>
                <section>
                    <div className="space-y-5 md:space-y-6">
                        {paragraphBlocks.map((block, blockIndex) => (
                            <p
                                key={blockIndex}
                                className="flex flex-wrap gap-x-1 gap-y-1 font-product text-[14px] font-normal leading-[1] text-slate-800 md:text-[16px] md:leading-[1]"
                            >
                                {block.split(' ').map((word, wordIndex) => (
                                    <span
                                        key={`${blockIndex}-${wordIndex}`}
                                        className="paragraph-word inline-block whitespace-nowrap"
                                    >
                                        {word}
                                    </span>
                                ))}
                            </p>
                        ))}
                    </div>
                </section>
            </article>
        </section>
    );
};

export default SimultaneousWords;
