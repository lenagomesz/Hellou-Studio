-- LEGADO: migracao manual do status approved.
ALTER TYPE order_status ADD VALUE 'approved' BEFORE 'processing';
