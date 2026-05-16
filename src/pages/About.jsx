import React from "react";
import Layout from "@/components/Layout";
import { breadcrumbSchema } from "@/config/seo";

const About = () => {
    const principles = [
        {
            title: "Sistemas antes que piezas sueltas",
            text: "Integramos adquisición, conversión, seguimiento, reportes y control comercial para que el crecimiento sea medible."
        },
        {
            title: "Tecnología al servicio del negocio",
            text: "Elegimos software a medida, integraciones o automatizaciones según el contexto real de cada empresa."
        },
        {
            title: "Implementación con criterio local",
            text: "Trabajamos desde Uruguay para negocios de Uruguay y LATAM, considerando WhatsApp, tiempos de atención y cultura de compra."
        }
    ];

    return (
        <Layout
            seo={{
                title: "Nosotros | Grupo DTE",
                description: "Conocé cómo trabaja Grupo DTE: estrategia, tecnología, automatización y operación para empresas que quieren crecer con orden.",
                url: "/nosotros",
                structuredData: [
                    breadcrumbSchema([
                        { name: "Inicio", path: "/" },
                        { name: "Nosotros", path: "/nosotros" },
                    ]),
                    {
                        "@context": "https://schema.org",
                        "@type": "AboutPage",
                        name: "Nosotros | Grupo DTE",
                        url: "https://grupodte.com/nosotros",
                    },
                ],
            }}
        >
            <article className="mx-auto max-w-5xl px-6 py-20 text-neutral-900 md:py-28">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0A8F20]">
                    Despegá Tu Empresa
                </p>
                <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1.05] md:text-6xl">
                    Somos DTE: estrategia, tecnología y operación para empresas que quieren crecer con orden.
                </h1>
                <p className="mt-8 max-w-3xl text-lg leading-8 text-neutral-600">
                    DTE combina consultoría, creatividad y ejecución técnica para construir sistemas de trabajo completos:
                    captación, conversión, seguimiento, informes y control comercial. No buscamos solo entregar piezas,
                    sino dejar una estructura clara para que cada empresa sepa qué se está haciendo, qué resultados hay
                    y cuál es el próximo paso.
                </p>

                <section className="mt-16 grid gap-6 md:grid-cols-3" aria-label="Principios de trabajo DTE">
                    {principles.map((principle) => (
                        <div key={principle.title} className="border-t border-neutral-200 pt-6">
                            <h2 className="text-xl font-bold">{principle.title}</h2>
                            <p className="mt-3 text-sm leading-6 text-neutral-600">{principle.text}</p>
                        </div>
                    ))}
                </section>

                <section className="mt-16 grid gap-10 rounded-[8px] bg-neutral-950 p-8 text-white md:grid-cols-[0.9fr_1.1fr] md:p-10">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0DD122]">
                            DTE Platform
                        </p>
                        <h2 className="mt-3 text-3xl font-bold leading-tight">
                            Servicios, plataforma y acompañamiento en un mismo sistema.
                        </h2>
                    </div>
                    <div className="space-y-4 text-sm leading-7 text-white/75">
                        <p>
                            Para clientes activos, DTE Platform centraliza proyectos, tareas, informes, facturas y
                            mensajería operativa. La plataforma existe para que el cliente tenga visibilidad real del
                            avance y para que el equipo trabaje con prioridades claras.
                        </p>
                        <p>
                            Nuestra misión es ayudar a empresas a construir flujos sostenibles de clientes, procesos
                            simples, herramientas integradas y métricas útiles para tomar mejores decisiones.
                        </p>
                    </div>
                </section>
            </article>
        </Layout>
    );
};

export default About;
