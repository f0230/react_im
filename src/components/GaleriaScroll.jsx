// src/components/GaleriaScroll.jsx
import WorkCard from './WorkCard';
import wc1 from '../assets/wc1.webp';
import wc2 from '../assets/wc2.webp';
import wc3 from '../assets/wc3.webp';
import wc4 from '../assets/wc4.webp';

const works = [
    { src: wc1, alt: 'Trabajo 1' },
    { src: wc2, alt: 'Trabajo 2' },
    { src: wc3, alt: 'Trabajo 3' },
    { src: wc4, alt: 'Trabajo 4' },
];

const GaleriaScroll = () => {
    return (
        <section className="py-6 px-4">
            <div className="overflow-x-auto no-scrollbar">
                <div className="flex gap-6 w-max transition-all duration-300">
                    {works.map((work, i) => (
                        <WorkCard key={i} imageSrc={work.src} altText={work.alt} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default GaleriaScroll;
