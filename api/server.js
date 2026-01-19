import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import checkAvailabilityHandler from './check-availability.js';
import createEventHandler from './create-event.js';
import { handleChatRequest } from './chat.js';
import hubspotLeadHandler from './hubspot-lead.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Adapter to convert Express req/res to Vercel-like handler signature (if needed)
// Luckily, Vercel default handlers (req, res) are compatible with Express middleware signature.

app.post('/api/chat', handleChatRequest);
app.post('/api/check-availability', checkAvailabilityHandler);
app.post('/api/create-event', createEventHandler);
app.post('/api/hubspot-lead', hubspotLeadHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Local Server running on http://localhost:${PORT}`);
    console.log(`👉 API Endpoints locally available at /api/*`);
});
