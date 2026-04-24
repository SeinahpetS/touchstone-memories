ALTER TABLE public.touchstones
  ADD COLUMN memory_season text,
  ADD COLUMN memory_year integer,
  ADD COLUMN memory_month integer,
  ADD COLUMN memory_day integer;

ALTER TABLE public.touchstones
  ADD CONSTRAINT touchstones_memory_season_check
    CHECK (memory_season IS NULL OR memory_season IN ('spring','summer','autumn','winter')),
  ADD CONSTRAINT touchstones_memory_month_check
    CHECK (memory_month IS NULL OR (memory_month BETWEEN 1 AND 12)),
  ADD CONSTRAINT touchstones_memory_day_check
    CHECK (memory_day IS NULL OR (memory_day BETWEEN 1 AND 31)),
  ADD CONSTRAINT touchstones_memory_year_check
    CHECK (memory_year IS NULL OR (memory_year BETWEEN 1000 AND 9999));