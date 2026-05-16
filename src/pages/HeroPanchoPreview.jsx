// HeroPanchoPreview.jsx — Standalone preview page for HeroProPancho
// Route: /hero-pancho  |  No Navbar, full-screen experience
import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroProPancho from "@/components/HeroProPancho";
import FadeContent from "@/components/ui/FadeContent";

gsap.registerPlugin(ScrollTrigger);

// ── Inline marquee (no deps, pure CSS) ────────────────────────────────────
const MARQUEE_TEXT = "DTE · CREAMOS MARCAS QUE CONQUISTAN · DISEÑO · ESTRATEGIA · TECNOLOGÍA · ";

function Marquee() {
  return (
    <div className="w-full overflow-hidden border-y border-white/[0.07] bg-[#0f0f0f] py-5">
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "marquee-slide 22s linear infinite" }}
      >
        {/* Three copies for seamless loop */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="mr-0 shrink-0 font-product text-sm font-semibold uppercase tracking-[0.22em] text-white/25"
          >
            {MARQUEE_TEXT}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee-slide {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}

// ── Services section ──────────────────────────────────────────────────────
const SERVICES = [
  {
    num: "01",
    title: "Estrategia de Marca",
    desc: "Posicionamiento, identidad y arquitectura de marca para empresas que quieren liderar su categoría.",
  },
  {
    num: "02",
    title: "Diseño & Producción",
    desc: "Visual identities, campañas, motion y experiencias digitales con craft de nivel internacional.",
  },
  {
    num: "03",
    title: "Tecnología & Automatización",
    desc: "Plataformas web, integración de sistemas y automatización de procesos que liberan tiempo real.",
  },
];

function ServicesSection() {
  const titleRef  = useRef(null);
  const itemsRef  = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Title words reveal
      const words = titleRef.current?.querySelectorAll(".s-word");
      gsap.from(words, {
        y: "105%",
        duration: 0.85,
        ease: "power4.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: titleRef.current,
          start: "top 78%",
        },
      });

      // Each service card slides up
      const cards = itemsRef.current?.querySelectorAll(".service-card");
      gsap.from(cards, {
        y: 50, opacity: 0,
        duration: 0.75, ease: "power3.out",
        stagger: 0.14,
        scrollTrigger: {
          trigger: itemsRef.current,
          start: "top 75%",
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section className="bg-[#0f0f0f] px-6 py-28 md:px-12 lg:px-20">
      <div className="mx-auto max-w-5xl">

        {/* Section label */}
        <FadeContent initialOpacity={0} className="mb-6">
          <p className="font-product text-[11px] font-semibold uppercase tracking-[0.22em] text-[#19d327]">
            Lo que hacemos
          </p>
        </FadeContent>

        {/* Title — clip reveal */}
        <div ref={titleRef} className="mb-20 overflow-hidden">
          <h2
            className="font-product font-bold leading-tight tracking-[-0.03em] text-white"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
          >
            {["Construimos", "negocios", "que", "perduran."].map((w, i) => (
              <span
                key={i}
                className="inline-block"
                style={{ overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.06em", marginRight: "0.3em" }}
              >
                <span className="s-word inline-block">{w}</span>
              </span>
            ))}
          </h2>
        </div>

        {/* Service items */}
        <div ref={itemsRef} className="space-y-0 divide-y divide-white/[0.07]">
          {SERVICES.map(({ num, title, desc }) => (
            <div
              key={num}
              className="service-card group flex flex-col gap-4 py-10 sm:flex-row sm:items-start sm:gap-16"
            >
              {/* Number */}
              <span className="font-product text-[11px] font-semibold tracking-widest text-white/20 sm:w-12 sm:shrink-0 sm:pt-1">
                {num}
              </span>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-12">
                <h3
                  className="font-product font-semibold text-white transition-colors duration-300 group-hover:text-[#19d327] sm:w-56 sm:shrink-0"
                  style={{ fontSize: "clamp(1.1rem, 2vw, 1.35rem)" }}
                >
                  {title}
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-white/45 sm:text-base">
                  {desc}
                </p>
              </div>

              {/* Hover arrow */}
              <span className="hidden text-[#19d327] opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block sm:pt-1">
                →
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Closing statement section ─────────────────────────────────────────────
function ClosingSection() {
  const titleRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const words = titleRef.current?.querySelectorAll(".c-word");
      gsap.from(words, {
        y: "105%",
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.07,
        scrollTrigger: {
          trigger: titleRef.current,
          start: "top 80%",
        },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-[#0c0c0c] px-6 py-28 text-center md:px-12">
      <div className="mx-auto max-w-4xl">

        <FadeContent initialOpacity={0} className="mb-6">
          <p className="font-product text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
            Siguiente paso
          </p>
        </FadeContent>

        {/* Big text — clip reveal */}
        <div ref={titleRef} className="mb-12">
          <p
            className="font-product font-bold leading-tight tracking-[-0.03em] text-white"
            style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
          >
            {["¿Listo", "para", "conquistar?"].map((w, i) => (
              <span
                key={i}
                className="inline-block"
                style={{ overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.06em", marginRight: "0.25em" }}
              >
                <span
                  className={`c-word inline-block${
                    i === 2
                      ? " bg-gradient-to-r from-[#19d327] to-[#7dd3fc] bg-clip-text text-transparent"
                      : ""
                  }`}
                >
                  {w}
                </span>
              </span>
            ))}
          </p>
        </div>

        <FadeContent initialOpacity={0} delay={200} className="mb-12">
          <p className="mx-auto max-w-sm font-product text-base leading-relaxed text-white/40">
            Conversemos sobre tu marca y construyamos algo que importe.
          </p>
        </FadeContent>

        <FadeContent initialOpacity={0} delay={350}>
          <a
            href="/contacto"
            className="group inline-flex h-14 items-center gap-2 rounded-full bg-[#19d327] px-10 font-product text-sm font-semibold text-black transition-shadow duration-300 hover:shadow-[0_0_32px_rgba(25,211,39,0.4)]"
          >
            <span>Hablemos</span>
            <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </FadeContent>

      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function HeroPanchoPreview() {
  return (
    <div className="bg-[#0f0f0f]">
      <HeroProPancho />
      <Marquee />
      <ServicesSection />
      <ClosingSection />
    </div>
  );
}
