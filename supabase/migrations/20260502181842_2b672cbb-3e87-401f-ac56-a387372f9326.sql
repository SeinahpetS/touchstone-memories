-- Add digital_traces to memory_category enum
ALTER TYPE public.memory_category ADD VALUE IF NOT EXISTS 'digital_traces';

-- Add connected_to (free text) and is_private columns to touchstones
ALTER TABLE public.touchstones
  ADD COLUMN IF NOT EXISTS connected_to TEXT,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;