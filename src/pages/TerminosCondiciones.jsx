// src/pages/TerminosCondiciones.jsx
import React from 'react';
import SEO from '../components/SEO';
import FadeContent from '../components/ui/FadeContent';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';

const TerminosCondiciones = () => {
    return (
        <>

        
            <SEO
                title="Términos y Condiciones | Grupo DTE"
                description="Lee los términos y condiciones de uso del sitio web de Grupo DTE. Información legal, uso del sitio, propiedad intelectual y contacto."
                image="https://www.grupodte.com/og-image.jpg" // reemplazalo si tenés una imagen definida
                url="https://www.grupodte.com/terminos-y-condiciones"
            />
            <Layout>

            <main className="px-6 py-16 max-w-4xl mx-auto text-neutral-800">
                <FadeContent>
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">Términos y Condiciones de Uso</h1>
                    <p className="text-sm text-neutral-500 mb-10">
                        Última actualización: 22 de mayo de 2025
                    </p>
                </FadeContent>

                <section className="space-y-10">
                    <FadeContent delay={100}>
                        <p>
                            Bienvenido al sitio web <strong>www.grupodte.com</strong> (en adelante, el “Sitio”), propiedad de <strong>Maria Jose Isgleas Rodriguez</strong>, titular legal de la marca y responsable de la operación comercial de Grupo DTE.
                        </p>
                        <p>
                            El uso de este Sitio implica la aceptación plena de los siguientes Términos y Condiciones. Si no estás de acuerdo con alguna de las condiciones aquí establecidas, por favor no utilices este Sitio.
                        </p>
                    </FadeContent>

                    {[
                        {
                            title: '1. Titularidad del Sitio',
                            content: 'El presente sitio web es operado por la empresa unipersonal Maria Jose Isgleas Rodriguez, con domicilio legal en Uruguay. Todos los derechos reservados.'
                        },
                        {
                            title: '2. Objeto',
                            content: 'Grupo DTE brinda servicios de marketing digital, desarrollo web, automatización y consultoría empresarial. La información publicada en el Sitio tiene fines informativos y comerciales.'
                        },
                        {
                            title: '3. Propiedad intelectual',
                            content: `Todos los contenidos del Sitio, incluyendo textos, imágenes, gráficos, logos, íconos, archivos de audio y software, son propiedad de Maria Jose Isgleas Rodriguez o de sus respectivos autores, y se encuentran protegidos por las leyes de propiedad intelectual.

Está prohibido el uso, reproducción o distribución de dichos contenidos sin autorización expresa por escrito.`
                        },
                        {
                            title: '4. Uso del sitio',
                            content: 'El usuario se compromete a utilizar este Sitio de forma lícita y respetuosa, absteniéndose de cualquier actividad que pueda dañar, sobrecargar o deteriorar el mismo o impedir su normal funcionamiento.'
                        },
                            {
                                title: '5. Protección de datos',
                                content: (
                                    <>
                                        <p className="mb-2">
                                            Cualquier información personal que se recopile a través de formularios será tratada conforme a la normativa vigente sobre protección de datos en Uruguay.
                                        </p>
                                        <p>
                                            Para más información, consultá nuestra{' '}
                                            <Link to="/politica-privacidad" className="text-blue-600 underline">
                                                Política de Privacidad
                                            </Link>.
                                        </p>
                                    </>
                                )
                            },
                          
                        {
                            title: '6. Modificaciones',
                            content: 'Maria Jose Isgleas Rodriguez se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en el Sitio.'
                        },
                        {
                            title: '7. Contacto legal',
                            content: `Para cualquier consulta relacionada con estos Términos y Condiciones, podés escribirnos a:
grupo@grupodte.com`
                        }
                    ].map(({ title, content }, i) => (
                        <FadeContent key={i} delay={200 + i * 100}>
                            <div>
                                {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
                                {typeof content === 'string'
                                    ? content.split('\n').map((p, idx) => <p key={idx} className="mb-2">{p}</p>)
                                    : content}

                            </div>
                        </FadeContent>
                    ))}
                </section>
            </main>
            </Layout>
        </>
    );
};

export default TerminosCondiciones;
