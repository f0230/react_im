import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FadeContent from '../components/ui/FadeContent';

gsap.registerPlugin(ScrollTrigger);

const bgColors = ['#fce4ec', '#e0f7fa', '#fff8e1', '#e8f5e9', '#ede7f6'];

const servicios = [
    {
        title: 'Servicios',
        text: 'En DTE trabajamos junto a empresas que buscan profesionalizarse, crecer y consolidar su identidad. Lo hacemos desde un enfoque integral, creativo y estratégico, acompañando proyectos desde la idea hasta la ejecución.',
    },
    {
        title: 'Nuestros Servicios:',
        text: '',
    },
    {
        title: 'Desarrollo de Proyectos',
        text: 'Acompañamos a empresas en el diseño, planificación y ejecución de proyectos específicos que impulsan su crecimiento y consolidación.',
    },
    {
        title: 'Rediseño de Marcas Existentes',
        text: 'Si ya tenés una marca y querés llevarla al siguiente nivel, trabajamos en redefinir su identidad visual, mensaje y posicionamiento estratégico.',
    },
    {
        title: 'Diseño y Creación de Espacios',
        text: 'Transformamos espacios físicos para que reflejen el ADN de tu marca. Desde oficinas hasta locales comerciales, hacemos que cada rincón comunique quién sos.',
    },
    {
        title: 'Identidad de Marca',
        text: 'Creamos marcas desde cero o fortalecemos las ya existentes. Definimos propósito, valores, tono comunicacional y estética visual que transmitan coherencia y profesionalismo.',
    },
    {
        title: 'Campañas para Impulsar Ventas',
        text: 'Diseñamos campañas comerciales que no solo comunican, sino que convierten. Estrategia, creatividad y ejecución para llegar a tus clientes y aumentar tus resultados.',
    },
    {
        title: 'Acompañamiento Integral',
        text: 'Te seguimos de cerca: trabajamos codo a codo en cada paso del proceso para asegurarnos de que las ideas se concreten y generen impacto real.',
    },
    {
        title: 'Planes de profesionalización personalizados',
        text: 'Evaluamos el estado actual de la empresa y diseñamos una hoja de ruta para su evolución.',
    },
    {
        title: 'Consultoría estratégica por áreas (comercial, operaciones, RRHH, etc.)',
        text: 'Acompañamiento focalizado según los desafíos específicos de cada sector.',
    },
    {
        title: 'Reestructuración organizacional',
        text: 'Optimización de roles, procesos y estructuras internas para mejorar eficiencia y claridad.',
    },
    {
        title: 'Manual de marca',
        text: 'Lineamientos claros de uso de logotipo, tipografías, colores, tono de voz, etc.',
    },
    {
        title: 'Comunicación interna profesionalizada',
        text: 'Estrategias para que los equipos estén informados, alineados y comprometidos.',
    },
    {
        title: 'Gestión de redes sociales y contenido estratégico',
        text: 'Desarrollo de contenido con identidad para conectar con el público objetivo.',
    },
    {
        title: 'Diseño de espacios con identidad (oficinas, tiendas, showrooms)',
        text: 'Ambientes que transmiten el espíritu de la marca y mejoran la experiencia del cliente o del equipo.',
    },
    {
        title: 'Eventos corporativos con identidad',
        text: 'Diseño de experiencias presenciales o virtuales alineadas con la marca.',
    },
    {
        title: 'Ambientaciones para campañas o lanzamientos',
        text: 'Escenografías o instalaciones temporales que acompañan acciones comerciales o comunicacionales.',
    },
    {
        title: 'Desarrollo de naming (nombre de marca, productos o líneas nuevas)',
        text: 'Proceso estratégico y creativo para elegir nombres con sentido y recordación.',
    },
    {
        title: 'Ideación de productos o servicios coherentes con la marca',
        text: 'Acompañamiento en el diseño de nuevas líneas de negocio con identidad fuerte.',
    },
    {
        title: 'Campañas internas para alinear y motivar equipos',
        text: 'Acciones creativas que refuercen cultura, valores y objetivos desde adentro.',
    },
    {
        title: 'Diseño y Desarrollo Web',
        text: 'Creamos sitios web que no solo se ven bien, sino que comunican quién sos como marca, funcionan bien y están preparados para escalar.',
    },
    {
        title: 'Sitios en WordPress',
        text: 'Diseño personalizado con identidad de marca. Webs autoadministrables. Optimización SEO básica. Integración con redes, formularios, newsletters y más.',
    },
    {
        title: 'Sitios a medida en React',
        text: 'Desarrollo moderno y escalable. Experiencias interactivas personalizadas. Integración con sistemas o apps externas. Ideal para empresas que buscan alta performance y flexibilidad.',
    },
    {
        title: 'Acompañamiento integral en el desarrollo de proyectos digitales',
        text: 'Te guiamos desde la planificación hasta la publicación y mantenimiento. Pensamos en cada detalle: estética, funcionalidad, contenido y estrategia.',
    },
];

const Servicios = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const sections = gsap.utils.toArray('.service-block');

        let ctx = gsap.context(() => {
            sections.forEach((section, index) => {
                const nextColor = bgColors[(index + 1) % bgColors.length];

                ScrollTrigger.create({
                    trigger: section,
                    start: 'top center',
                    end: 'bottom center',
                    scrub: true,
                    onUpdate: self => {
                        console.log('ScrollTrigger update', self.progress); // ✅ DEBUG


                        const progress = self.progress;

                        const startColor = gsap.utils.splitColor(bgColors[index % bgColors.length]);
                        const endColor = gsap.utils.splitColor(nextColor);

                        const r = Math.round(gsap.utils.interpolate(startColor[0], endColor[0], progress));
                        const g = Math.round(gsap.utils.interpolate(startColor[1], endColor[1], progress));
                        const b = Math.round(gsap.utils.interpolate(startColor[2], endColor[2], progress));

                        const gradient = `radial-gradient(circle at 30% 40%, rgba(${r},${g},${b},0.4), transparent 80%), 
                              radial-gradient(circle at 70% 80%, rgba(${r},${g},${b},0.2), transparent 80%)`;

                        containerRef.current.style.backgroundImage = gradient;
                    },
                });
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <main
            ref={containerRef}
            className="relative transition-colors duration-[1500ms] ease-in-out min-h-screen flex flex-col items-center font-product text-black overflow-hidden"
            style={{
                backgroundImage: `radial-gradient(circle at 30% 40%, rgba(252, 228, 236, 0.4), transparent 80%), 
      radial-gradient(circle at 70% 80%, rgba(252, 228, 236, 0.2), transparent 80%)`,
                backgroundSize: '200% 200%',
            }}
        >
            {/* 🌬️ Fondo animado "respirando" */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 animate-auroraBreath transition-all duration-1000">
                    {/* Blur difuso + mezcla de luz */}
                    <div className="absolute inset-0 backdrop-blur-[12px] bg-white/20 mix-blend-soft-light" />

                    {/* Auroras flotantes animadas */}
                    <div className="absolute -top-[30%] -left-[20%] w-[150%] h-[150%] bg-gradient-to-tr from-pink-300 via-blue-200 to-purple-300 opacity-80 blur-[100px] rounded-full animate-auroraMotion animate-auroraTransform" />
                    <div className="absolute top-[20%] left-[10%] w-[60vw] h-[60vw] bg-gradient-to-br from-yellow-100 via-pink-200 to-pink-100 opacity-60 blur-[100px] rounded-full animate-auroraMotion animate-auroraTransform" />
                </div>
            </div>

            {/* 🧠 Fondo Aurora base con grilla + luces suaves */}
            <div className="absolute inset-0 z-0 before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.3),transparent_70%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.2),transparent_70%)] before:animate-auroraMotion before:blur-2xl before:opacity-50 after:absolute after:inset-0 after:content-[''] after:bg-[radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] after:bg-[length:20px_20px] after:opacity-40" />

            {/* 📦 Contenido de los servicios */}
            <div className="relative z-10 mt-[50px] flex flex-col px-4 md:px-20 w-full md:max-w-[1080px]">
                {servicios.map((servicio, index) => (
                    <FadeContent
                        key={index}
                        blur
                        delay={index * 80}
                        className="mb-16 service-block"
                        data-bg={bgColors[index % bgColors.length]}
                    >
                        <div className="rounded-2xl p-6 md:p-8 shadow-md bg-white/60 backdrop-blur-md transition-transform hover:scale-[1.01] hover:shadow-xl">
                            <h2 className="text-xl md:text-2xl font-bold mb-2 leading-tight">{servicio.title}</h2>
                            {servicio.text && (
                                <p className="text-base font-normal text-gray-800 leading-relaxed whitespace-pre-line">
                                    {servicio.text}
                                </p>
                            )}
                        </div>
                    </FadeContent>
                ))}
            </div>
        </main>



    );
};

export default Servicios;
