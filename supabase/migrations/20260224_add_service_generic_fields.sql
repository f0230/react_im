-- Add generic fields to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS deadline timestamptz,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS budget text,
ADD COLUMN IF NOT EXISTS deliverables text,
ADD COLUMN IF NOT EXISTS requirements text;

-- Add comments for clarity
COMMENT ON COLUMN public.services.deadline IS 'Fecha límite de entrega del servicio';
COMMENT ON COLUMN public.services.priority IS 'Prioridad del servicio: low, medium, high';
COMMENT ON COLUMN public.services.budget IS 'Presupuesto estimado o acordado';
COMMENT ON COLUMN public.services.deliverables IS 'Lista de entregables finales';
COMMENT ON COLUMN public.services.requirements IS 'Lo que necesitamos del cliente para cumplir';
