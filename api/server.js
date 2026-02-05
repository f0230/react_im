import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectCreatedHandler from './project-created.js';
import clientWelcomeEmailHandler from './client-welcome-email.js';
import slackNotifyHandler from './slack-notify.js';
import calHandler from './cal/index.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Adapter to convert Express req/res to Vercel-like handler signature (if needed)
// Luckily, Vercel default handlers (req, res) are compatible with Express middleware signature.

app.post('/api/project-created', projectCreatedHandler);
app.post('/api/client-welcome-email', clientWelcomeEmailHandler);
app.post('/api/slack-notify', slackNotifyHandler);

// Cal.com Routes
app.all('/api/cal/:action', calHandler);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Local Server running on http://localhost:${PORT}`);
    console.log(`👉 API Endpoints locally available at /api/*`);
});
