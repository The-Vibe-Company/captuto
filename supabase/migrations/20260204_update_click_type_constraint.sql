-- Update click_type CHECK constraint to allow new step types
-- Drop the existing constraint and add a new one with expanded values

-- First, drop the existing constraint
ALTER TABLE public.steps DROP CONSTRAINT IF EXISTS steps_click_type_check;

-- Add new constraint with expanded values
ALTER TABLE public.steps
ADD CONSTRAINT steps_click_type_check
CHECK (click_type IN ('click', 'navigation', 'text', 'heading', 'divider'));
