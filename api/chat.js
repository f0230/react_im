import OpenAI from 'openai';
import dotenv from 'dotenv';
import { cleoPrompt } from './prompts/cleoPrompt.js';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function handleChatRequest(req, res) {
    const { messages, persona = 'cleo' } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Parámetro "messages" inválido o vacío' });
    }

    const systemPrompt = cleoPrompt; // en futuro: usar mapa de prompts por persona

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages,
            ],
            temperature: 0.7,
            max_tokens: 500,
            timeout: 10000,
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        if (!reply) throw new Error('Respuesta vacía de OpenAI');

        return res.status(200).json({ reply });
    } catch (err) {
        console.error('❌ Error al generar respuesta de Cleo:', err.response?.data || err.message);
        return res.status(500).json({
            error: 'Error generando respuesta',
            details: err.response?.data || err.message,
        });
    }
}
