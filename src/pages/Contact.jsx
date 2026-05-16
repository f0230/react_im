import React from "react";
import Layout from "@/components/Layout";
import { contactInfo } from "@/config/branding";
import { breadcrumbSchema } from "@/config/seo";

const Contact = () => {
    const whatsappUrl = "https://wa.me/59896280674?text=Hola%2C%20quiero%20hablar%20con%20Grupo%20DTE";

    return (
        <Layout
            seo={{
                title: "Contacto | Grupo DTE",
                description: "Contactá a Grupo DTE por WhatsApp, email o videollamada para diagnosticar tu proyecto y definir los próximos pasos.",
                url: "/contacto",
                structuredData: [
                    breadcrumbSchema([
                        { name: "Inicio", path: "/" },
                        { name: "Contacto", path: "/contacto" },
                    ]),
                    {
                        "@context": "https://schema.org",
                        "@type": "ContactPage",
                        name: "Contacto | Grupo DTE",
                        url: "https://grupodte.com/contacto",
                    },
                ],
            }}
        >
            <section className="mx-auto grid max-w-5xl gap-12 px-6 py-20 text-neutral-900 md:grid-cols-[1fr_0.85fr] md:py-28">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0A8F20]">
                        Contacto
                    </p>
                    <h1 className="mt-4 text-4xl font-bold leading-[1.05] md:text-6xl">
                        Hablemos de tu empresa, tu sistema comercial y el próximo paso.
                    </h1>
                    <p className="mt-8 text-lg leading-8 text-neutral-600">
                        El canal más rápido para primer contacto es WhatsApp. Si el tema requiere más detalle,
                        coordinamos una videollamada para revisar objetivos, contexto y prioridades antes de proponer
                        una hoja de ruta.
                    </p>

                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-neutral-800"
                        >
                            Escribir por WhatsApp
                        </a>
                        <a
                            href="https://grupodte.com/meet"
                            className="inline-flex h-12 items-center justify-center rounded-full border border-neutral-300 px-6 text-sm font-semibold text-neutral-900 transition hover:border-neutral-900"
                        >
                            Agendar diagnóstico
                        </a>
                    </div>
                </div>

                <aside className="rounded-[8px] border border-neutral-200 p-6 md:p-8" aria-label="Canales de contacto">
                    <h2 className="text-2xl font-bold">Canales y horarios</h2>
                    <dl className="mt-8 space-y-6 text-sm">
                        <div>
                            <dt className="font-semibold text-neutral-950">WhatsApp</dt>
                            <dd className="mt-1 text-neutral-600">Coordinación rápida y seguimiento diario.</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-neutral-950">Email</dt>
                            <dd className="mt-1">
                                <a className="text-neutral-700 underline-offset-4 hover:underline" href={`mailto:${contactInfo.email}`}>
                                    {contactInfo.email}
                                </a>
                            </dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-neutral-950">Teléfono</dt>
                            <dd className="mt-1">
                                <a className="text-neutral-700 underline-offset-4 hover:underline" href="tel:+59896219905">
                                    {contactInfo.phone}
                                </a>
                            </dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-neutral-950">Horario habitual</dt>
                            <dd className="mt-1 text-neutral-600">Lunes a viernes, 10:00 a 17:00, hora de Uruguay.</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-neutral-950">Clientes activos</dt>
                            <dd className="mt-1 text-neutral-600">
                                Usan DTE Platform para proyectos, informes, facturas y mensajería operativa.
                            </dd>
                        </div>
                    </dl>
                </aside>
            </section>
        </Layout>
    );
};

export default Contact;
