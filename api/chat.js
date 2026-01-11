import OpenAI from 'openai';
import dotenv from 'dotenv';
import { cleoPrompt } from '../server/prompts/cleoPrompt.js';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function handleChatRequest(req, res) {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
        return res.status(400).json({ error: 'Faltan los mensajes o no son válidos.' });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: cleoPrompt },
                ...messages,
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        if (!reply) throw new Error('Respuesta vacía de OpenAI');

        res.status(200).json({ reply });
    } catch (err) {
        console.error('❌ Error al generar respuesta de Cleo:', err.response?.data || err.message);
        res.status(500).json({
            error: 'Error generando respuesta',
            details: err.response?.data || err.message,
        });
    }
}

// ✅ Exportación por defecto para Vercel
export default handleChatRequest;
