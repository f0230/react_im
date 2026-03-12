import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import SEO from '@/components/SEO';
import ScrollVelocity from '@/components/ui/ScrollVelocity';
import { ShatterButton } from '@/components/ui/shatter-button';
import BlurText from '@/components/ui/TextBlur';
import { BubbleAnimation } from '@/components/ui/bubble-animation';
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

/* ─── Service item row ─────────────────────────────────── */
const ServiceItem = ({ title, text, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ delay: index * 0.07, duration: 0.55, ease: 'easeOut' }}
    className="group border-t border-black/15 pt-5 pb-6 cursor-default"
  >
    <div className="flex gap-4 items-start">
      <span className="text-[11px] font-bold text-black/25 tabular-nums pt-1 w-6 shrink-0">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex-1">
        <h3 className="text-base md:text-lg font-bold leading-snug group-hover:text-skyblue transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-black/55 mt-1.5 leading-relaxed">
          {text}
        </p>
      </div>
    </div>
    <div className="mt-4 h-px bg-skyblue/0 group-hover:bg-skyblue/25 transition-all duration-500 origin-left scale-x-0 group-hover:scale-x-100" />
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
          className="w-full h-full object-cover scale-[1.15]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-white/[0.88]" />
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
            className="text-[96px] md:text-[140px] font-bold leading-none text-black/[0.04] select-none shrink-0 -mb-4"
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
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/35 mb-1.5 font-medium">
              Área
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
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
          className="h-px bg-black/20 mb-10 origin-left"
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
    <span className="text-[10px] tracking-[0.25em] uppercase">Scroll</span>
    <div className="w-px h-10 bg-white/30" />
  </motion.div>
);

/* ─── Floating badge ────────────────────────────────────── */
const FloatingBadge = ({ children, className = '' }) => (
  <motion.div
    animate={{ y: [0, -8, 0] }}
    transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
    className={`absolute hidden md:flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white text-xs font-medium ${className}`}
  >
    {children}
  </motion.div>
);

/* ─── Main page ─────────────────────────────────────────── */
const Servicios = () => {
  const { t } = useTranslation();
  const heroRef = useRef(null);

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroContentOpacity = useTransform(heroScroll, [0, 0.75], [1, 0]);
  const heroContentY = useTransform(heroScroll, [0, 0.75], ['0%', '-12%']);

  const introService = servicios[0];
  const categorized = {};
  servicios.slice(1).forEach((s) => {
    if (!categorized[s.category]) categorized[s.category] = [];
    categorized[s.category].push(s);
  });

  return (
    <>
      <SEO
        title={t('servicesPage.seo.title')}
        description={t('servicesPage.seo.description')}
        image="https://grupodte.com/og-servicios.jpg"
        url="https://grupodte.com/servicios"
      />

      <Layout noFooter>
        {/* ── HERO ─────────────────────────────────────── */}
        <section
          ref={heroRef}
          className="relative h-screen min-h-[600px] overflow-hidden"
        >
          {/* Bubble animation background */}
          <div className="absolute inset-0 overflow-hidden">
            <BubbleAnimation
              width={1920}
              height={1080}
              totalBubbles={20}
              colors={["#018ddc", "#f12a00", "#ec6546", "#b0c90d"]}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Floating badges */}
          <FloatingBadge className="top-[28%] left-[8%]">
            <span className="w-1.5 h-1.5 rounded-full bg-green" />
            Estrategia
          </FloatingBadge>
          <FloatingBadge className="top-[38%] right-[10%]" style={{ animationDelay: '1.2s' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-banana" />
            Branding
          </FloatingBadge>
          <FloatingBadge className="bottom-[30%] left-[12%]" style={{ animationDelay: '0.6s' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-skyblue" />
            Digital
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
              className="text-[11px] md:text-xs uppercase tracking-[0.35em] mb-5 text-white/50 font-medium"
            >
              Grupo DTE
            </motion.p>

            <BlurText
              text={t('servicesPage.title')}
              delay={70}
              animateBy="words"
              className="text-5xl md:text-7xl font-bold mb-5 leading-tight justify-center"
            />

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7 }}
              className="text-base md:text-lg max-w-lg text-white/65 mb-14 leading-relaxed"
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
              className="text-xl md:text-2xl leading-relaxed text-black/65 font-product text-center"
            >
              {t(introService.textKey)}
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
                  <p className="text-xs uppercase tracking-widest text-black/40 mt-1">{label}</p>
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
              href="/meet"
              shatterColor="#e3ff31"
              className="text-base"
            >
              {t('servicesPage.cta.button')}
            </ShatterButton>
          </motion.div>
        </section>
      </Layout>
    </>
  );
};

export default Servicios;
