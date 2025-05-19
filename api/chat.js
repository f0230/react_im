import OpenAI from 'openai';
import dotenv from 'dotenv';
import { cleoPrompt } from './prompts/cleoPrompt.js';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    const { messages } = req.body;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: cleoPrompt,
                },
                ...messages,
            ],
        });

        const reply = completion.choices[0].message.content;
        res.status(200).json({ reply });
    } catch (err) {
        console.error('❌ Error al generar respuesta de Cleo:', err);
        res.status(500).json({ error: 'Error generando respuesta' });
    }
}
