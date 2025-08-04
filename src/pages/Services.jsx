import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ServiceCard from '@/components/ui/ServiceCard';
import { servicios } from '@/data/serviciosList';
import TrueFocus from '@/components/ui/TrueFocus';
import PageWrapper from "@/components/layout/PageWrapper";
import CleoWidget from "@/components/CleoChat";
import SEO from '@/components/SEO';
import BlurText from '../components/ui/TextBlur';

import Layout from "@/components/Layout";


gsap.registerPlugin(ScrollTrigger);

const Servicios = () => {
    const containerRef = useRef(null);

    return (
        <>

            <SEO
                title="Servicios | Grupo DTE"
                description="Conocé nuestros servicios de desarrollo web, automatización de marketing y diseño personalizado para empresas modernas."
                image="https://grupodte.com/og-servicios.jpg"
                url="https://grupodte.com/servicios"
            />

            <Layout>

            <PageWrapper>
                <main
                    ref={containerRef}
                    className=" relative transition-colors duration-[1500ms] ease-in-out flex flex-col items-center font-product text-black w-full pt-[80px] pb-[100px]"
                >
                    {/* 🏷️ Título principal */}
                    <div className="relative z-10 px-4 md:px-20 w-full md:max-w-[1080px] text-center">
                            <BlurText
                                text="Listado de Servicios"
                                delay={100}
                                animateBy="words"
                                className="text-4xl md:text-5xl font-bold mb-4"
                            />
                            <BlurText
                                text="Ofrecemos una aplia gama de servicios para ayudar a tu empresa a crecer y destacar en el mundo digital. Desde desarrollo web hasta automatización de marketing, tenemos la solución perfecta para tus necesidades."
                                delay={100}
                                animateBy="words"
                                className="text-1xl md:text-2xl font-normal mb-4"
                            />
                    </div>

                    {/* 📦 Lista de servicios */}
                    <div
                        id="servicios-lista"
                        className="relative z-10 mt-[50px] flex flex-col px-4 md:px-20 w-full md:max-w-[1080px]"
                    >
                        {servicios.map((servicio, index) => (
                            <ServiceCard
                                key={index}
                                title={servicio.title}
                                text={servicio.text}
                                index={index}
                            />
                        ))}
                    </div>
                </main>
            </PageWrapper>
            </Layout>
            <CleoWidget />
        
        </>
    );
};

export default Servicios;
