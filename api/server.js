import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectCreatedHandler from './project-created.js';
import clientWelcomeEmailHandler from './client-welcome-email.js';
import slackNotifyHandler from './slack-notify.js';
import calHandler from './cal/index.js';
import clawbotTeamChatHandler from './clawbot-team-chat.js';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/project-created', projectCreatedHandler);
app.post('/api/client-welcome-email', clientWelcomeEmailHandler);
app.post('/api/slack-notify', slackNotifyHandler);
app.post('/api/clawbot-team-chat', clawbotTeamChatHandler);



// Cal.com Routes
app.all('/api/cal/:action', calHandler);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Local Server running on http://localhost:${PORT}`);
    console.log(`👉 API Endpoints locally available at /api/*`);
});
