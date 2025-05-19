// /api/chat.js
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const dteServicios = `
Nuestros Servicios:

1. Desarrollo de Proyectos
Acompañamos a empresas en el diseño, planificación y ejecución de proyectos que impulsan su crecimiento.

2. Rediseño de Marcas Existentes
Replanteamos la identidad visual, mensaje y posicionamiento estratégico de marcas activas.

3. Diseño de Espacios
Creamos ambientes que reflejan el ADN de marca: oficinas, tiendas, showrooms.

4. Identidad de Marca
Definimos propósito, tono, valores, estilo visual y narrativa coherente.

... [continúa todo tu contenido aquí]
`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Solo se permite POST' });
    }

    const { messages } = req.body;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `Sos Cleo, una experta creativa de DTE.
Solo podés responder usando esta información:

"""
${dteServicios}
"""

No inventes. Si no sabés algo, decí: "No tengo esa información por ahora, pero puedo averiguarlo."
Usá un tono cálido, claro y profesional. Siempre hablá en primera persona.`,
                },
                ...messages,
            ],
        });

        const reply = completion.choices[0].message.content;
        return res.status(200).json({ reply });
    } catch (err) {
        console.error('❌ Error generando respuesta de Cleo:', err);
        return res.status(500).json({ error: 'Error generando respuesta' });
    }
}
