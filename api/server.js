import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectCreatedHandler from './project-created.js';
import clientWelcomeEmailHandler from './client-welcome-email.js';
import slackNotifyHandler from './slack-notify.js';
import calHandler from './cal/index.js';
import clawbotTeamChatHandler from './clawbot-team-chat.js';
import metaConnectUrlHandler from './meta/connect-url.js';
import metaCallbackHandler from './meta/callback.js';
import metaProjectConnectionHandler from './meta/project-connection.js';
import metaRefreshAccountsHandler from './meta/refresh-accounts.js';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/project-created', projectCreatedHandler);
app.post('/api/client-welcome-email', clientWelcomeEmailHandler);
app.post('/api/slack-notify', slackNotifyHandler);
app.post('/api/clawbot-team-chat', clawbotTeamChatHandler);
app.get('/api/meta/connect-url', metaConnectUrlHandler);
app.get('/api/meta/callback', metaCallbackHandler);
app.all('/api/meta/project-connection', metaProjectConnectionHandler);
app.post('/api/meta/refresh-accounts', metaRefreshAccountsHandler);




// Cal.com Routes
app.all('/api/cal/:action', calHandler);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Local Server running on http://localhost:${PORT}`);
    console.log(`👉 API Endpoints locally available at /api/*`);
});
