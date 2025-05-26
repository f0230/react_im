// src/pages/PoliticaPrivacidad.jsx
import React from 'react';
import SEO from '../components/SEO';
import FadeContent from '../components/ui/FadeContent';
import Layout from '../components/Layout';

const PoliticaPrivacidad = () => {
    return (
        <>

        <Layout>
            <SEO
                title="Política de Privacidad | Grupo DTE"
                description="Conocé cómo recopilamos, usamos y protegemos tus datos personales en Grupo DTE. Transparencia y compromiso con tu privacidad."
                image="https://www.grupodte.com/og-image.jpg" // reemplazalo si tenés una imagen específica
                url="https://www.grupodte.com/politica-privacidad"
            />

            <main className="px-6 py-16 max-w-4xl mx-auto text-neutral-800">
                <FadeContent>
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">Política de Privacidad</h1>
                    <p className="text-sm text-neutral-500 mb-10">
                        Última actualización: 22 de mayo de 2025
                    </p>
                </FadeContent>

                <section className="space-y-10">
                    <FadeContent delay={100}>
                        <p>
                            En <strong>www.grupodte.com</strong> (en adelante, el “Sitio”), propiedad de <strong>Maria Jose Isgleas Rodriguez</strong>, nos comprometemos a proteger la privacidad de nuestros usuarios y clientes. Esta política describe cómo recopilamos, usamos y protegemos tus datos personales.
                        </p>
                    </FadeContent>

                    {[
                        {
                            title: '1. Responsable del tratamiento',
                            content: `El responsable de los datos personales recogidos a través de este Sitio es:
ISGLEAS RODRIGUEZ MARIA JOSE

Correo electrónico: grupo@grupodte.com`
                        },
                        {
                            title: '2. Datos que recopilamos',
                            content: `Podemos recopilar la siguiente información:

- Nombre y apellido
- Dirección de correo electrónico
- Número de teléfono
- Información sobre tu empresa o proyecto
- Cualquier otro dato que proporciones voluntariamente a través de formularios de contacto, suscripción o chat`
                        },
                        {
                            title: '3. Finalidades del tratamiento',
                            content: `Utilizamos los datos recopilados para:

- Responder a tus consultas o solicitudes
- Brindarte información sobre nuestros servicios
- Enviarte comunicaciones comerciales, si diste tu consentimiento
- Mejorar la calidad de nuestro sitio y servicios`
                        },
                        {
                            title: '4. Legitimación',
                            content: `El tratamiento de tus datos se basa en:

- Tu consentimiento expreso al completar formularios del Sitio
- El interés legítimo de mantener la relación comercial o precontractual`
                        },
                        {
                            title: '5. Destinatarios de los datos',
                            content: `No compartimos tus datos con terceros, salvo obligación legal o en caso de trabajar con proveedores de servicios tecnológicos que cumplan con las normas de protección de datos.`
                        },
                        {
                            title: '6. Derechos del usuario',
                            content: `Tenés derecho a:

- Acceder a tus datos personales
- Solicitar la rectificación o eliminación
- Limitar u oponerte al tratamiento
- Solicitar la portabilidad de tus datos

Podés ejercer estos derechos escribiéndonos a grupo@grupodte.com.`
                        },
                        {
                            title: '7. Seguridad de los datos',
                            content: `Aplicamos medidas técnicas y organizativas para proteger tus datos personales contra accesos no autorizados, pérdida o destrucción.`
                        },
                        {
                            title: '8. Cookies',
                            content: `Este Sitio puede utilizar cookies para mejorar la experiencia del usuario. Podés configurar tu navegador para rechazar o eliminar las cookies.`
                        },
                        {
                            title: '9. Cambios en esta política',
                            content: `Podemos modificar esta Política en cualquier momento. La versión vigente estará siempre disponible en esta misma página.`
                        }
                    ].map(({ title, content }, i) => (
                        <FadeContent key={i} delay={200 + i * 100}>
                            <div>
                                <h2 className="text-xl font-semibold mb-2">{title}</h2>
                                {content.split('\n').map((p, idx) => (
                                    <p key={idx} className="mb-2">{p}</p>
                                ))}
                            </div>
                        </FadeContent>
                    ))}
                </section>
            </main>
            </Layout>
        </>
    );
};

export default PoliticaPrivacidad;
