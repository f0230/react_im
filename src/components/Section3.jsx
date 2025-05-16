import React, { useEffect, useRef, useState } from "react";
import OptimizedImage from "./OptimizedImage";
import BannerWeb from "../assets/BANNER_CAMPAÑA.webp";
import BannerMovil from "../assets/BANNER_CAMPAÑA_MOVIL.webp";
import BannerMovilDTE from "../assets/BgMov_dtelohace.webp";
import BannerWebDTE from "../assets/BgWeb_dtelohace.webp";
import Cinta from "../assets/cinta.webp"

const Section2 = () => {
  const bannerWebRef = useRef(null);
  const bannerMobileRef = useRef(null);
  const firstSectionRef = useRef(null);
  const [bgBannerDTE, setBgBannerDTE] = useState(BannerWebDTE);

  useEffect(() => {
    const updateBanner = () => {
      if (window.innerWidth < 768) {
        setBgBannerDTE(BannerMovilDTE);
      } else {
        setBgBannerDTE(BannerWebDTE);
      }
    };

    updateBanner(); // inicial
    window.addEventListener("resize", updateBanner);
    return () => window.removeEventListener("resize", updateBanner);
  }, []);

  useEffect(() => {
    const loadGSAP = async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const animateElement = (ref) => {
        if (ref.current) {
          gsap.fromTo(
            ref.current,
            { opacity: 0.95, y: 50 },
            {
              opacity: 1,
              y: 0,
              ease: "power2.out",
              duration: 1,
              scrollTrigger: {
                trigger: ref.current,
                start: "top 100%",
                end: "bottom 70%",
                scrub: 1,
              },
            }
          );
        }
      };

      [firstSectionRef, bannerWebRef, bannerMobileRef].forEach(animateElement);
    };

    loadGSAP();

    return () => {
      if (window.ScrollTrigger) {
        window.ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      }
    };
  }, []);

  return (
    <section className="font-product relative w-full flex justify-center items-start px-2 z-10 mt-2">
      <div className="relative w-full max-w-[1440px] overflow-hidden mt-1 sm:mt-0">
        <div className="flex flex-col md:flex-row w-full gap-2">
          {/* Bloque de texto con fondo dinámico */}
          <div
            ref={firstSectionRef}
            className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] bg-cover bg-center bg-no-repeat bg-crem/10 p-6 opacity-0 translate-y-10"
            style={{ backgroundImage: `url(${bgBannerDTE})` }}
          >
            <div className="h-full flex flex-col justify-center items-center text-center">
              <h2 className="text-[40px] md:text-[60px] font-normal">
                DTE lo{" "}
                <span
                  className="text-black bg-no-repeat bg-center"
                  style={{
                    backgroundImage: `url(${Cinta})`,
                    backgroundSize: "125%",
                    padding: "2px 6px",
                    display: "inline-block",
                  }}
                >
                  hace
                </span>
              </h2>

              <h3 className="mt-[-10px] md:mt-[-20px] mb-5 text-greyburger text-[20px] md:text-[40px] font-normal">
                proyectos + ideas
              </h3>
              <p className="mb-10 md:mb-[75px] w-[250px] md:w-[323px] text-[12px] md:text-[17px] text-gray-600 leading-none">
                Te ayudamos a tomar decisiones estratégicas para que tu nuevo proyecto crezca con foco, coherencia y resultados.
              </p>
              <button className="text-[13px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-full hover:bg-skyblue/95 transition duration-300">
                Ver más
              </button>
            </div>
          </div>

          {/* Bloque con imagen animada */}
          <div className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <h2 className="text-white text-[40px] md:text-[60px] font-normal">Campañas</h2>
              <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white leading-none">
                creativas y estratégicas que conectan con tu público
              </p>
              <button className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full hover:bg-blue-400 transition duration-300 mb-6">
                Contáctanos
              </button>
            </div>

            {/* Imagen web */}
            <div className="absolute inset-0 hidden sm:block z-10 opacity-0 translate-y-10" ref={bannerWebRef}>
              <OptimizedImage
                src={BannerWeb}
                mobileSrc={null}
                alt="Banner Web"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Imagen móvil */}
            <div className="absolute inset-0 sm:hidden z-10 opacity-0 translate-y-10" ref={bannerMobileRef}>
              <OptimizedImage
                src={BannerWeb}
                mobileSrc={BannerMovil}
                alt="Banner Móvil"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section2;
