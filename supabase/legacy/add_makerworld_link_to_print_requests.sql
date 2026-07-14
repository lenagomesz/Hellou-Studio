-- LEGADO: migracao manual do link MakerWorld.
ALTER TABLE print_requests
ADD COLUMN IF NOT EXISTS makerworld_link TEXT;

-- Index for querying by makerworld link
CREATE INDEX IF NOT EXISTS idx_print_requests_makerworld_link ON print_requests(makerworld_link);
