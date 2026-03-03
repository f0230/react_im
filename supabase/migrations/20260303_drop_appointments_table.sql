-- Cal.com is now the single source of truth for bookings.
-- Apply this only after deploying the app version that no longer reads/writes public.appointments.

DROP TABLE IF EXISTS public.appointments CASCADE;

