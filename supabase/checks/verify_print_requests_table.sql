-- Verificacao somente leitura da estrutura de print_requests.
-- Run this in Supabase SQL Editor to check if the table has all required columns

SELECT
  column_name,
  data_type,
  is_nullable
FROM
  information_schema.columns
WHERE
  table_name = 'print_requests'
ORDER BY
  ordinal_position;

-- Check table constraints
SELECT
  constraint_name,
  constraint_type
FROM
  information_schema.table_constraints
WHERE
  table_name = 'print_requests';
