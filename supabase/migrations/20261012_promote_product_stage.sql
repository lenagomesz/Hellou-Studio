-- Turn one existing product-only stage into a shared stage without showing it
-- twice to customers. Its position and the other local positions are retained.
ALTER TABLE public.product_customization_steps
  ADD COLUMN IF NOT EXISTS label_override text
  CHECK (label_override IS NULL OR char_length(btrim(label_override)) BETWEEN 1 AND 80);

CREATE OR REPLACE FUNCTION public.promote_product_stage(
  p_product_id uuid, p_section_id text, p_name text, p_description text
) RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_sections jsonb;
  v_section jsonb;
  v_remaining jsonb;
  v_position bigint;
  v_order integer;
  v_step_id uuid := gen_random_uuid();
BEGIN
  IF char_length(btrim(p_name)) NOT BETWEEN 1 AND 80
     OR char_length(btrim(p_description)) NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'Informe nome e descrição válidos para a etapa compartilhada.';
  END IF;

  SELECT customization_sections INTO v_sections
  FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado.'; END IF;
  SELECT section, position INTO v_section, v_position
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_sections) = 'array' THEN v_sections ELSE '[]'::jsonb END)
    WITH ORDINALITY AS sections(section, position)
  WHERE section->>'id' = p_section_id LIMIT 1;
  IF v_section IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada neste produto.'; END IF;
  IF v_section ? 'showWhen' AND v_section->'showWhen' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'Remova a condição de exibição desta etapa antes de padronizá-la.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_sections) AS sections(section)
    WHERE section->'showWhen'->>'sectionId' = p_section_id
  ) THEN
    RAISE EXCEPTION 'Outra etapa depende desta. Remova a condição antes de padronizar.';
  END IF;

  v_order := coalesce((v_section->>'sortOrder')::integer, (v_position - 1)::integer * 10);
  SELECT coalesce(jsonb_agg(
    CASE WHEN section ? 'sortOrder' THEN section
      ELSE section || jsonb_build_object('sortOrder', (position - 1) * 10) END
    ORDER BY position) FILTER (WHERE position <> v_position), '[]'::jsonb)
  INTO v_remaining
  FROM jsonb_array_elements(v_sections) WITH ORDINALITY AS sections(section, position);

  INSERT INTO public.customization_steps (id, name, description, definition)
  VALUES (v_step_id, btrim(p_name), btrim(p_description),
    (v_section - 'sortOrder') || jsonb_build_object('id', 'step-' || v_step_id::text));
  INSERT INTO public.product_customization_steps (product_id, step_id, sort_order, required)
  VALUES (p_product_id, v_step_id, v_order, coalesce((v_section->>'required')::boolean, true));
  UPDATE public.products SET customization_sections = v_remaining WHERE id = p_product_id;
  RETURN jsonb_build_object('stepId', v_step_id, 'sections', v_remaining);
END;
$$;

REVOKE ALL ON FUNCTION public.promote_product_stage(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_product_stage(uuid, text, text, text) TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_customization_steps ENABLE ROW LEVEL SECURITY;
