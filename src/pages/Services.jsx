import { useRef } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import SEO from '@/components/SEO';
import ScrollVelocity from '@/components/ui/ScrollVelocity';
import { ShatterButton } from '@/components/ui/shatter-button';
import BlurText from '@/components/ui/TextBlur';
import { BubbleAnimation } from '@/components/ui/bubble-animation';
import Noise from '@/components/ui/Noise';
import { servicios, categories } from '@/data/serviciosList';

import portadaImg from '@/assets/PORTADA_1.webp';
import campanaImg from '@/assets/BANNER_CAMPAÑA.webp';
import espaciosImg from '@/assets/BANNER_ESPACIOS.webp';
import empresasImg from '@/assets/EMPRESAS.webp';
import compuImg from '@/assets/compu_fondo.webp';
import profeImg from '@/assets/Profeweb.webp';

const CATEGORY_IMAGES = {
  proyectos: profeImg,
  marca: portadaImg,
  estrategia: empresasImg,
  campanas: campanaImg,
  espacios: espaciosImg,
  digital: compuImg,
};

const renderTitleWithAside = (title) => {
  const match = title.match(/^(.*?)(\s*\([^)]*\))$/);
  if (!match) return title;

  const [, mainTitle, aside] = match;
  return (
    <>
      {mainTitle}
      <span className="block text-[0.82em] font-normal">{aside}</span>
    </>
  );
};

/* ─── Service item row ─────────────────────────────────── */
const ServiceItem = ({ title, text, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ delay: index * 0.07, duration: 0.55, ease: 'easeOut' }}
    className="group border-t border-white/15 pt-5 pb-6 cursor-default"
  >
    <div className="flex gap-4 items-start">
      <span className="text-[22px] font-bold text-white/20 tabular-nums pt-1 w-6 shrink-0">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex-1">
        <h3 className="text-base md:text-lg font-bold leading-[1] md:leading-[1] !text-white group-hover:!text-[#0DD122] transition-colors duration-300">
          {renderTitleWithAside(title)}
        </h3>
        <p className="text-sm !text-white/85 mt-1.5 leading-[1] md:leading-[1]">
          {text}
        </p>
      </div>
    </div>
    <div className="mt-4 h-px bg-[#0DD122]/0 group-hover:bg-[#0DD122]/25 transition-all duration-500 origin-left scale-x-0 group-hover:scale-x-100" />
  </motion.div>
);

/* ─── Category section with parallax background ────────── */
const CategorySection = ({ category, services, index, t }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);
  const image = CATEGORY_IMAGES[category.id];
  const isEven = index % 2 === 0;

  return (
    <section ref={ref} className="relative overflow-hidden py-24 md:py-36">
      {/* Parallax background image */}
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover scale-[1.15] blur-[100px]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 opacity-[0.34] pointer-events-none">
          <Noise patternSize={180} patternRefreshInterval={2} patternAlpha={34} />
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12">
        {/* Category header */}
        <div className={`mb-10 flex items-end gap-4 ${isEven ? '' : 'flex-row-reverse text-right'}`}>
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="text-[96px] md:text-[140px] font-bold leading-none text-white/[0.08] select-none shrink-0 -mb-4"
          >
            {category.number}
          </motion.span>

          <motion.div
            initial={{ opacity: 0, x: isEven ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="pb-2"
          >
            <p className="text-[11px] leading-[1] uppercase tracking-[0.2em] !text-white/60 mb-1.5 font-medium">
              Área
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-[1] md:leading-[1] !text-white">
              {t(category.labelKey)}
            </h2>
          </motion.div>
        </div>

        {/* Animated divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
          className="h-px bg-white/20 mb-10 origin-left"
        />

        {/* Services grid */}
        <div className="grid md:grid-cols-2 gap-x-14">
          {services.map((service, i) => (
            <ServiceItem
              key={service.titleKey}
              title={t(service.titleKey)}
              text={t(service.textKey)}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Animated scroll indicator ────────────────────────── */
const ScrollIndicator = () => (
  <motion.div
    animate={{ y: [0, 10, 0] }}
    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
    className="flex flex-col items-center gap-2 text-white/50"
  >
    <span className="text-[10px] leading-[1] tracking-[0.25em] uppercase">Scroll</span>
    <div className="w-px h-10 bg-white/30" />
  </motion.div>
);

/* ─── Floating badge ────────────────────────────────────── */
const FloatingBadge = ({
  children,
  className = '',
  strengthX = 0,
  strengthY = 0,
  delay = 0,
  mouseX,
  mouseY,
}) => {
  const offsetX = useSpring(useTransform(mouseX, (value) => value * strengthX), {
    stiffness: 120,
    damping: 18,
    mass: 0.45,
  });
  const offsetY = useSpring(useTransform(mouseY, (value) => value * strengthY), {
    stiffness: 120,
    damping: 18,
    mass: 0.45,
  });

  return (
    <motion.div className={`absolute hidden md:block ${className}`} style={{ x: offsetX, y: offsetY }}>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay }}
        className="flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-[17px] font-normal text-white backdrop-blur-sm"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

/* ─── Main page ─────────────────────────────────────────── */
const Servicios = () => {
  const { t } = useTranslation();
  const heroRef = useRef(null);
  const whatsappUrl = `https://wa.me/59896280674?text=${encodeURIComponent(t('section1.whatsappMessage'))}`;

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const heroContentOpacity = useTransform(heroScroll, [0, 0.75], [1, 0]);
  const heroContentY = useTransform(heroScroll, [0, 0.75], ['0%', '-12%']);

  const introService = servicios[0];
  const categorized = {};
  servicios.slice(1).forEach((s) => {
    if (!categorized[s.category]) categorized[s.category] = [];
    categorized[s.category].push(s);
  });

  const handleHeroMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;

    mouseX.set((relativeX - 0.5) * 2);
    mouseY.set((relativeY - 0.5) * 2);
  };

  const handleHeroMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <>
      <SEO
        title={t('servicesPage.seo.title')}
        description={t('servicesPage.seo.description')}
        image="https://grupodte.com/og-servicios.jpg"
        url="https://grupodte.com/servicios"
      />

      <Layout noFooter>
        <div className="font-google-sans-flex">
        {/* ── HERO ─────────────────────────────────────── */}
        <section
          ref={heroRef}
          className="relative h-screen min-h-[600px] overflow-hidden"
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
        >
          {/* Bubble animation background */}
          <div className="absolute inset-0 overflow-hidden">
            <BubbleAnimation
              width={1920}
              height={1080}
              totalBubbles={20}
              colors={["#FF3500", "#0DD122", "#2E2E2E"]}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 opacity-[0.32] pointer-events-none">
              <Noise patternSize={160} patternRefreshInterval={2} patternAlpha={34} />
            </div>
          </div>

          {/* Floating badges */}
          <FloatingBadge className="top-[28%] left-[8%]" strengthX={-18} strengthY={-12} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-green" />
            Estrategia
          </FloatingBadge>
          <FloatingBadge className="top-[22%] right-[8%]" strengthX={22} strengthY={-8} delay={0.2} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3500]" />
            Ventas
          </FloatingBadge>
          <FloatingBadge className="top-[68%] right-[12%]" strengthX={18} strengthY={12} delay={0.8} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-banana" />
            Funnels
          </FloatingBadge>
          <FloatingBadge className="bottom-[12%] right-[26%]" strengthX={14} strengthY={18} delay={1.6} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            IA
          </FloatingBadge>
          <FloatingBadge className="top-[38%] right-[10%]" strengthX={20} strengthY={-10} delay={1.2} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-banana" />
            Branding
          </FloatingBadge>
          <FloatingBadge className="top-[18%] left-[18%]" strengthX={-24} strengthY={-16} delay={0.4} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#0DD122]" />
            Automatizaciones
          </FloatingBadge>
          <FloatingBadge className="top-[56%] right-[16%]" strengthX={16} strengthY={12} delay={1.8} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3500]" />
            Campañas
          </FloatingBadge>
          <FloatingBadge className="bottom-[30%] left-[12%]" strengthX={-14} strengthY={14} delay={0.6} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-skyblue" />
            Digital
          </FloatingBadge>
          <FloatingBadge className="bottom-[18%] left-[22%]" strengthX={-22} strengthY={18} delay={1} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            CRM
          </FloatingBadge>
          <FloatingBadge className="bottom-[22%] left-[34%]" strengthX={-12} strengthY={16} delay={1.4} mouseX={mouseX} mouseY={mouseY}>
            <span className="w-1.5 h-1.5 rounded-full bg-skyblue" />
            Desarrollo Web
          </FloatingBadge>

          {/* Hero content */}
          <motion.div
            className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 text-white"
            style={{ opacity: heroContentOpacity, y: heroContentY }}
          >
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="text-[11px] md:text-xs leading-[1] uppercase tracking-[0.35em] mb-5 text-white/50 font-medium"
            >
              Grupo DTE
            </motion.p>

            <BlurText
              text={t('servicesPage.title')}
              delay={70}
              animateBy="words"
              className="text-5xl md:text-7xl font-bold mb-5 leading-[1] md:leading-[1] justify-center"
            />

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7 }}
              className="text-base md:text-lg max-w-lg text-white/65 mb-14 leading-[1] md:leading-[1]"
            >
              {t('servicesPage.description')}
            </motion.p>

            <ScrollIndicator />
          </motion.div>
        </section>

        {/* ── TICKER ───────────────────────────────────── */}
        <div className="py-3 bg-black overflow-hidden border-t border-white/5">
          <ScrollVelocity
            texts={[
              t('servicesPage.ticker.row1'),
              t('servicesPage.ticker.row2'),
            ]}
            velocity={55}
            className="text-white/70 text-4xl md:text-5xl uppercase tracking-tighter font-bold"
            parallaxStyle={{ padding: '2px 0' }}
          />
        </div>

        {/* ── INTRO ────────────────────────────────────── */}
        <section className="py-20 md:py-28 px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="text-[17px] leading-[1] text-black/65 text-center"
            >
              {t(introService.textKey).split('DTE').map((part, index, parts) => (
                <span key={`${part}-${index}`}>
                  {part}
                  {index < parts.length - 1 ? <strong className="font-bold text-black">DTE</strong> : null}
                </span>
              ))}
            </motion.p>

            {/* Service count stat */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-14 flex flex-wrap justify-center gap-10"
            >
              {[
                { num: '22+', label: 'Servicios' },
                { num: '6', label: 'Áreas de expertise' },
                { num: '360°', label: 'Enfoque integral' },
              ].map(({ num, label }) => (
                <div key={label} className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-black">{num}</p>
                  <p className="text-xs leading-[1] uppercase tracking-widest text-black/40 mt-1">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── CATEGORIES ───────────────────────────────── */}
        {categories.map((cat, i) => (
          <CategorySection
            key={cat.id}
            category={cat}
            services={categorized[cat.id] || []}
            index={i}
            t={t}
          />
        ))}

        {/* ── CTA ──────────────────────────────────────── */}
        <section className="py-28 px-6 bg-black text-white text-center overflow-hidden relative">
          {/* Decorative blobs */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-skyblue/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-banana/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.3] pointer-events-none">
            <Noise patternSize={200} patternRefreshInterval={2} patternAlpha={30} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="relative z-10 max-w-xl mx-auto"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-5 leading-tight">
              {t('servicesPage.cta.title')}
            </h2>
            <p className="text-white/50 text-lg mb-10 leading-relaxed">
              {t('servicesPage.cta.subtitle')}
            </p>
            <ShatterButton
              href={whatsappUrl}
              shatterColor="#0DD122"
              className="text-base"
            >
              {t('servicesPage.cta.button')}
            </ShatterButton>
          </motion.div>
        </section>
        </div>
      </Layout>
    </>
  );
};

export default Servicios;
