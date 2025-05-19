// api/server.js
import express from 'express';
import cors from 'cors';
import { handleChatRequest } from './chat.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', handleChatRequest);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🧠 Cleo API corriendo en http://localhost:${PORT}`);
});
