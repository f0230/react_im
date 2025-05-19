// /api/chat.js
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const dteServicios = `
Nuestros Servicios:

1. Desarrollo de Proyectos
Acompañamos a empresas en el diseño, planificación y ejecución de proyectos específicos que impulsan su crecimiento.

2. Rediseño de Marcas Existentes
Replanteamos la identidad visual, mensaje y posicionamiento de marcas ya activas.

3. Diseño y Creación de Espacios
Transformamos espacios físicos para reflejar el ADN de marca: oficinas, tiendas, showrooms.

4. Identidad de Marca
Creamos o fortalecemos marcas: propósito, tono, valores, estética visual, coherencia y profesionalismo.

5. Campañas para Impulsar Ventas
Diseño y ejecución de campañas comerciales con estrategia y creatividad para resultados reales.

6. Acompañamiento Integral
Trabajamos en conjunto en cada paso para asegurar impacto real.

7. Profesionalización Empresarial
- Planes personalizados de evolución
- Consultoría estratégica por áreas
- Reestructuración organizacional

8. Manual de Marca
Lineamientos de uso del logo, tipografía, tono, colores, etc.

9. Comunicación Interna Profesional
Estrategias de alineación y compromiso para equipos.

10. Redes Sociales y Contenido Estratégico
Contenido con identidad y foco en conexión con el público.

11. Eventos y Ambientaciones
- Eventos corporativos alineados a la marca
- Escenografías para campañas o lanzamientos

12. Naming y Productos Nuevos
- Naming estratégico de marcas y productos
- Ideación de nuevos servicios o líneas coherentes

13. Cultura Interna
Campañas creativas para alinear equipos con valores y objetivos.

14. Diseño y Desarrollo Web
- Sitios en WordPress: identidad, SEO básico, integraciones
- Sitios a medida en React: performance, escalabilidad, sistemas externos
- Acompañamiento integral: desde la idea al mantenimiento
`;

export async function POST(req, res) {
    const { messages } = await req.json();

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `Sos Cleo, una experta creativa de la agencia DTE.
  Usá solamente esta información:
  
  """
  ${dteServicios}
  """
  
  Si no sabés algo, decí: "No tengo esa información por ahora, pero puedo averiguarlo."
  Hablá en primera persona con tono cálido, claro y profesional.`,
                },
                ...messages,
            ],
        });

        res.status(200).json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: 'Algo salió mal generando la respuesta de Cleo.' });
    }
  }