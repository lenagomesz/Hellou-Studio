ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS customization_question text,
  ADD COLUMN IF NOT EXISTS customization_help_text text,
  ADD COLUMN IF NOT EXISTS customization_placeholder text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_customization_question_length_check,
  DROP CONSTRAINT IF EXISTS products_customization_help_text_length_check,
  DROP CONSTRAINT IF EXISTS products_customization_placeholder_length_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_customization_question_length_check
    CHECK (customization_question IS NULL OR char_length(customization_question) <= 120),
  ADD CONSTRAINT products_customization_help_text_length_check
    CHECK (customization_help_text IS NULL OR char_length(customization_help_text) <= 300),
  ADD CONSTRAINT products_customization_placeholder_length_check
    CHECK (customization_placeholder IS NULL OR char_length(customization_placeholder) <= 180);

COMMENT ON COLUMN public.products.customization_question IS
  'Pergunta exibida ao cliente quando o produto exige personalização.';
COMMENT ON COLUMN public.products.customization_help_text IS
  'Orientação exibida abaixo da pergunta de personalização.';
COMMENT ON COLUMN public.products.customization_placeholder IS
  'Exemplo exibido dentro do campo de personalização.';

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
