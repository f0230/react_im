import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectCreatedHandler from './project-created.js';
import clientWelcomeEmailHandler from './client-welcome-email.js';
import appointmentsAvailabilityHandler from './appointments-availability.js';
import appointmentsHandler from './appointments.js';
import calAvailabilityHandler from './cal-availability.js';
import calCreateBookingHandler from './cal-create-booking.js';
import calBookingsHandler from './cal-bookings.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Adapter to convert Express req/res to Vercel-like handler signature (if needed)
// Luckily, Vercel default handlers (req, res) are compatible with Express middleware signature.

app.post('/api/project-created', projectCreatedHandler);
app.post('/api/client-welcome-email', clientWelcomeEmailHandler);
app.get('/api/appointments-availability', appointmentsAvailabilityHandler);
app.post('/api/appointments-availability', appointmentsAvailabilityHandler);
app.post('/api/appointments', appointmentsHandler);
app.patch('/api/appointments', appointmentsHandler);
app.put('/api/appointments', appointmentsHandler);
app.delete('/api/appointments', appointmentsHandler);

// Cal.com Routes
app.get('/api/cal/availability', calAvailabilityHandler);
app.post('/api/cal/create-booking', calCreateBookingHandler);
app.get('/api/cal/bookings', calBookingsHandler);
// app.post('/api/cal/cancel-booking', ...); // To be implemented if needed


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Local Server running on http://localhost:${PORT}`);
    console.log(`👉 API Endpoints locally available at /api/*`);
});
