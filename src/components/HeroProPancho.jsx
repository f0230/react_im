// HeroProPancho.jsx — GSAP word-clip reveal, gradient text, premium entry sequence
import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FadeContent from "./ui/FadeContent";

gsap.registerPlugin(ScrollTrigger);

// ── Magnetic button ────────────────────────────────────────────────────────
function MagneticButton({ children, className, onClick }) {
  const ref = useRef(null);
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={className}
      onMouseMove={(e) => {
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const x = (e.clientX - (left + width / 2)) * 0.3;
        const y = (e.clientY - (top + height / 2)) * 0.3;
        ref.current.style.transition = "transform 0.1s linear";
        ref.current.style.transform  = `translate(${x}px, ${y}px)`;
      }}
      onMouseLeave={() => {
        ref.current.style.transition = "transform 0.5s cubic-bezier(0.16,1,0.3,1)";
        ref.current.style.transform  = "translate(0,0)";
      }}
    >
      {children}
    </button>
  );
}

// ── Word that slides out of a clip mask ────────────────────────────────────
// The outer span clips the travel; GSAP animates the inner span.
function ClipWord({ word, gradient = false }) {
  return (
    <span
      className="inline-block"
      style={{ overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.06em" }}
    >
      <span
        className={`word-inner inline-block${
          gradient
            ? " bg-gradient-to-r from-[#19d327] to-[#7dd3fc] bg-clip-text text-transparent"
            : ""
        }`}
      >
        {word}
      </span>
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
const HeroProPancho = ({ onContactClick, onRegisterClick }) => {
  const rootRef    = useRef(null);
  const badgeRef   = useRef(null);
  const line1Ref   = useRef(null);
  const line2Ref   = useRef(null);
  const subRef     = useRef(null);
  const ctasRef    = useRef(null);
  const metricsRef = useRef(null);
  const lineRef    = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const line1Words = line1Ref.current?.querySelectorAll(".word-inner");
      const line2Words = line2Ref.current?.querySelectorAll(".word-inner");

      const tl = gsap.timeline({ delay: 0.25 });

      // 1. Badge slides down
      tl.from(badgeRef.current, {
        opacity: 0, y: -20, scale: 0.88,
        duration: 0.7, ease: "back.out(1.5)",
      });

      // 2. Line 1 — words slide up out of their clip masks
      tl.from(line1Words, {
        y: "110%",
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.07,
      }, "-=0.35");

      // 3. Line 2 — overlapping with line 1 tail
      tl.from(line2Words, {
        y: "110%",
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.07,
      }, "-=0.6");

      // 4. Subheadline fades up
      tl.from(subRef.current, {
        opacity: 0, y: 30,
        duration: 0.75, ease: "power3.out",
      }, "-=0.5");

      // 5. CTA buttons stagger in
      tl.from(Array.from(ctasRef.current?.children ?? []), {
        opacity: 0, y: 22,
        duration: 0.65, ease: "power3.out",
        stagger: 0.12,
      }, "-=0.4");

      // 6. Metrics stagger in
      tl.from(Array.from(metricsRef.current?.children ?? []), {
        opacity: 0, y: 24,
        duration: 0.55, ease: "power3.out",
        stagger: 0.1,
      }, "-=0.35");

      // 7. Accent line expands from center
      tl.from(lineRef.current, {
        scaleX: 0, opacity: 0,
        duration: 0.8, ease: "power3.out",
        transformOrigin: "center",
      }, "-=0.5");

    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="font-product relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0f0f0f]"
      aria-label="DTE — Agencia Creativa"
    >
      {/* Subtle bg gradients — still, not animated */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#19d327]/[0.06] blur-[130px]" />
        <div className="absolute -bottom-40 -right-40 h-[460px] w-[460px] rounded-full bg-[#7dd3fc]/[0.05] blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_30%,#0f0f0f_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-24 pt-32 text-center md:px-12">

        {/* Badge */}
        <div
          ref={badgeRef}
          className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 backdrop-blur-sm"
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#19d327] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#19d327]" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
            Agencia Creativa · Uruguay
          </span>
        </div>

        {/* Headline — word clip reveal */}
        <h1
          className="mb-7 font-bold leading-[1.04] tracking-[-0.03em] text-white"
          style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}
        >
          {/* Line 1 */}
          <div ref={line1Ref} className="flex flex-wrap justify-center gap-x-[0.25em]">
            <ClipWord word="Creamos" />
            <ClipWord word="marcas" gradient />
          </div>
          {/* Line 2 */}
          <div ref={line2Ref} className="flex flex-wrap justify-center gap-x-[0.25em]">
            <ClipWord word="que" />
            <ClipWord word="conquistan" />
          </div>
        </h1>

        {/* Subheadline */}
        <p
          ref={subRef}
          className="mb-12 max-w-md text-base leading-relaxed text-white/50 sm:text-lg"
        >
          Estrategia, diseño y tecnología para marcas que quieren{" "}
          <span className="text-white/80">crecer con identidad</span>.
        </p>

        {/* CTAs */}
        <div ref={ctasRef} className="mb-20 flex flex-wrap items-center justify-center gap-4">
          <MagneticButton
            onClick={() => onContactClick?.()}
            className="group relative inline-flex h-[52px] items-center overflow-hidden rounded-full bg-[#19d327] px-9 text-sm font-semibold text-black"
          >
            <span className="relative z-10">Trabajemos juntos</span>
            <span className="absolute inset-0 -translate-x-full skew-x-[-15deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </MagneticButton>

          <MagneticButton
            onClick={() => onRegisterClick?.()}
            className="group inline-flex h-[52px] items-center gap-2 rounded-full border border-white/15 px-9 text-sm font-semibold text-white/60 backdrop-blur-sm transition-colors duration-300 hover:border-white/30 hover:text-white"
          >
            <span>Ver nuestro trabajo</span>
            <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </MagneticButton>
        </div>

        {/* Accent divider */}
        <div
          ref={lineRef}
          className="mb-12 h-px w-full max-w-xs bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        {/* Metrics */}
        <div
          ref={metricsRef}
          className="grid grid-cols-3 gap-10 sm:gap-16"
        >
          {[
            { n: "200+", l: "Clientes" },
            { n: "8 años", l: "Experiencia" },
            { n: "50+", l: "Marcas" },
          ].map(({ n, l }) => (
            <div key={l} className="group flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-white transition-colors duration-300 group-hover:text-[#19d327] sm:text-3xl">
                {n}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-white/30">
                {l}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2" aria-hidden="true">
        <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/20">scroll</span>
        <div className="h-8 w-px animate-[bounce_1.8s_ease-in-out_infinite] bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </section>
  );
};

export default HeroProPancho;
