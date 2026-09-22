-- Reusable color sets for product variation creation in the admin catalog.
CREATE TABLE IF NOT EXISTS public.product_option_color_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.product_option_color_preset_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES public.product_option_color_presets(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  hex text NOT NULL CHECK (hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (preset_id, name),
  UNIQUE (preset_id, hex)
);

CREATE INDEX IF NOT EXISTS idx_product_option_color_preset_items_preset
  ON public.product_option_color_preset_items(preset_id, sort_order, created_at);

INSERT INTO public.product_option_color_presets (name, sort_order)
VALUES ('Cores padrão', 0)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.product_option_color_preset_items (preset_id, name, hex, sort_order)
SELECT preset.id, seed.name, seed.hex, seed.sort_order
FROM public.product_option_color_presets AS preset
CROSS JOIN (
  VALUES
    ('Branco', '#FFFFFF', 0), ('Preto', '#1A1A1A', 10), ('Rosa', '#EC4899', 20),
    ('Vermelho', '#EF4444', 30), ('Laranja', '#F97316', 40), ('Amarelo', '#EAB308', 50),
    ('Verde', '#22C55E', 60), ('Verde-escuro', '#15803D', 70), ('Azul', '#3B82F6', 80),
    ('Azul-escuro', '#1E40AF', 90), ('Roxo', '#A855F7', 100), ('Lilás', '#C084FC', 110),
    ('Cinza', '#6B7280', 120), ('Bege', '#D4A574', 130), ('Dourado', '#D4AF37', 140),
    ('Prata', '#C0C0C0', 150)
) AS seed(name, hex, sort_order)
WHERE preset.name = 'Cores padrão'
ON CONFLICT (preset_id, hex) DO NOTHING;

ALTER TABLE public.product_option_color_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_color_preset_items ENABLE ROW LEVEL SECURITY;
