-- Verificação somente de leitura do esquema esperado pela aplicação.
-- Resultado 1: deve retornar zero linhas.
WITH required_tables(schema_name, object_name) AS (
  VALUES
    ('public', 'users'),
    ('public', 'products'),
    ('public', 'product_options'),
    ('public', 'orders'),
    ('public', 'order_items'),
    ('public', 'coupons'),
    ('public', 'print_requests'),
    ('public', 'inventory_materials'),
    ('public', 'inventory_expenses'),
    ('public', 'admin_notifications'),
    ('public', 'user_activity_events')
),
required_columns(table_name, column_name) AS (
  VALUES
    ('products', 'fulfillment_mode'),
    ('products', 'is_customizable'),
    ('products', 'type'),
    ('products', 'file_path'),
    ('product_options', 'ready_stock'),
    ('product_options', 'production_lead_days'),
    ('orders', 'payment_provider'),
    ('orders', 'mp_payment_id'),
    ('order_items', 'customization_text'),
    ('users', 'admin_access_level'),
    ('users', 'admin_active'),
    ('users', 'last_seen_at'),
    ('coupons', 'exclusive_user_id'),
    ('coupons', 'bonus_title'),
    ('coupons', 'bonus_description'),
    ('coupons', 'show_in_bonus_area')
),
missing_tables AS (
  SELECT 'table' AS object_type, schema_name || '.' || object_name AS object_name
  FROM required_tables
  WHERE to_regclass(schema_name || '.' || object_name) IS NULL
),
missing_columns AS (
  SELECT 'column' AS object_type, 'public.' || required_columns.table_name || '.' || required_columns.column_name AS object_name
  FROM required_columns
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND information_schema.columns.table_name = required_columns.table_name
      AND information_schema.columns.column_name = required_columns.column_name
  )
)
SELECT * FROM missing_tables
UNION ALL
SELECT * FROM missing_columns
ORDER BY object_type, object_name;

-- Resultado 2: todas as tabelas públicas devem estar com RLS ativo.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

-- Resultado 3: deve retornar zero linhas para anon e authenticated.
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, table_name, privilege_type;

-- Resultado 4: a função compartilhada pelos gatilhos deve existir.
SELECT to_regprocedure('public.set_updated_at()') AS set_updated_at_function;
