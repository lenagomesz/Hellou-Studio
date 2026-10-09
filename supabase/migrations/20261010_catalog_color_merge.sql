-- Merge one canonical color into another in a single transaction. Product,
-- option and preset IDs remain stable; order snapshots are never rewritten.
CREATE OR REPLACE FUNCTION public.replace_catalog_color_choices(
  p_colors jsonb, p_source_id uuid, p_source_hex text,
  p_target_id uuid, p_target_name text, p_target_hex text
) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(
    CASE WHEN color->>'colorId' = p_source_id::text
      OR (color->>'colorId' IS NULL AND upper(color->>'value') = p_source_hex)
      THEN color || jsonb_build_object('colorId', p_target_id, 'label', p_target_name, 'value', p_target_hex)
      ELSE color END ORDER BY position
  ), '[]'::jsonb)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_colors) = 'array' THEN p_colors ELSE '[]'::jsonb END)
    WITH ORDINALITY AS choices(color, position);
$$;

CREATE OR REPLACE FUNCTION public.merge_catalog_color(p_source_id uuid, p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_source public.catalog_colors%ROWTYPE;
  v_target public.catalog_colors%ROWTYPE;
  v_item record;
  v_product record;
  v_step record;
  v_match uuid;
  v_sections jsonb;
  v_definition jsonb;
  v_options integer := 0;
  v_presets integer := 0;
  v_products integer := 0;
  v_steps integer := 0;
BEGIN
  IF p_source_id = p_target_id THEN RAISE EXCEPTION 'Escolha outra cor para substituir.'; END IF;
  PERFORM 1 FROM public.catalog_colors WHERE id IN (p_source_id, p_target_id) ORDER BY id FOR UPDATE;
  SELECT * INTO v_source FROM public.catalog_colors WHERE id = p_source_id;
  SELECT * INTO v_target FROM public.catalog_colors WHERE id = p_target_id;
  IF v_source.id IS NULL OR v_target.id IS NULL THEN RAISE EXCEPTION 'Cor de origem ou destino não encontrada.'; END IF;

  UPDATE public.product_options
  SET catalog_color_id = v_target.id, color = v_target.hex, color_name = v_target.name
  WHERE catalog_color_id = v_source.id
     OR (catalog_color_id IS NULL AND upper(color) = v_source.hex);
  GET DIAGNOSTICS v_options = ROW_COUNT;

  FOR v_item IN SELECT id, preset_id, name FROM public.product_option_color_preset_items
    WHERE catalog_color_id = v_source.id OR (catalog_color_id IS NULL AND upper(hex) = v_source.hex)
  LOOP
    SELECT id INTO v_match FROM public.product_option_color_preset_items
    WHERE preset_id = v_item.preset_id AND id <> v_item.id
      AND (catalog_color_id = v_target.id OR upper(hex) = v_target.hex)
    ORDER BY created_at, id LIMIT 1;
    IF v_match IS NOT NULL THEN
      UPDATE public.product_options SET color_preset_item_id = v_match WHERE color_preset_item_id = v_item.id;
      DELETE FROM public.product_option_color_preset_items WHERE id = v_item.id;
    ELSE
      UPDATE public.product_option_color_preset_items AS item
      SET catalog_color_id = v_target.id, hex = v_target.hex,
          name = CASE WHEN EXISTS (
            SELECT 1 FROM public.product_option_color_preset_items AS other
            WHERE other.preset_id = v_item.preset_id AND other.id <> v_item.id AND other.name = v_target.name
          ) THEN item.name ELSE v_target.name END
      WHERE item.id = v_item.id;
    END IF;
    v_match := NULL;
    v_presets := v_presets + 1;
  END LOOP;

  FOR v_product IN SELECT id, customization_sections FROM public.products
    WHERE jsonb_typeof(customization_sections) = 'array'
  LOOP
    SELECT coalesce(jsonb_agg(
      CASE WHEN jsonb_typeof(section->'colors') = 'array' THEN
        jsonb_set(section, '{colors}', public.replace_catalog_color_choices(
          section->'colors', v_source.id, v_source.hex, v_target.id, v_target.name, v_target.hex))
      ELSE section END ORDER BY position), '[]'::jsonb)
    INTO v_sections
    FROM jsonb_array_elements(v_product.customization_sections) WITH ORDINALITY AS sections(section, position);
    IF v_sections IS DISTINCT FROM v_product.customization_sections THEN
      UPDATE public.products SET customization_sections = v_sections WHERE id = v_product.id;
      v_products := v_products + 1;
    END IF;
  END LOOP;

  FOR v_step IN SELECT id, definition FROM public.customization_steps
    WHERE jsonb_typeof(definition->'colors') = 'array'
  LOOP
    v_definition := jsonb_set(v_step.definition, '{colors}', public.replace_catalog_color_choices(
      v_step.definition->'colors', v_source.id, v_source.hex, v_target.id, v_target.name, v_target.hex));
    IF v_definition IS DISTINCT FROM v_step.definition THEN
      UPDATE public.customization_steps SET definition = v_definition, updated_at = now() WHERE id = v_step.id;
      v_steps := v_steps + 1;
    END IF;
  END LOOP;

  DELETE FROM public.catalog_colors WHERE id = v_source.id;
  RETURN jsonb_build_object('options', v_options, 'presets', v_presets, 'products', v_products, 'steps', v_steps);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_unused_catalog_color(p_color_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_color public.catalog_colors%ROWTYPE;
BEGIN
  SELECT * INTO v_color FROM public.catalog_colors WHERE id = p_color_id FOR UPDATE;
  IF v_color.id IS NULL THEN RAISE EXCEPTION 'Cor não encontrada.'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_options WHERE catalog_color_id = p_color_id
             OR (catalog_color_id IS NULL AND upper(color) = v_color.hex))
    OR EXISTS (SELECT 1 FROM public.product_option_color_preset_items WHERE catalog_color_id = p_color_id
               OR (catalog_color_id IS NULL AND upper(hex) = v_color.hex))
    OR EXISTS (
      SELECT 1 FROM public.products p
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.customization_sections) = 'array'
        THEN p.customization_sections ELSE '[]'::jsonb END) AS sections(section)
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(section->'colors') = 'array'
        THEN section->'colors' ELSE '[]'::jsonb END) AS choices(choice)
      WHERE choice->>'colorId' = p_color_id::text
         OR (choice->>'colorId' IS NULL AND upper(choice->>'value') = v_color.hex)
    )
    OR EXISTS (
      SELECT 1 FROM public.customization_steps step
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(step.definition->'colors') = 'array'
        THEN step.definition->'colors' ELSE '[]'::jsonb END) AS choices(choice)
      WHERE choice->>'colorId' = p_color_id::text
         OR (choice->>'colorId' IS NULL AND upper(choice->>'value') = v_color.hex)
    )
  THEN
    RAISE EXCEPTION 'Esta cor ainda é usada. Substitua-a por outra cor ou inative-a antes de excluir.';
  END IF;
  DELETE FROM public.catalog_colors WHERE id = p_color_id;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_catalog_color_choices(jsonb, uuid, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.merge_catalog_color(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_unused_catalog_color(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_catalog_color_choices(jsonb, uuid, text, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.merge_catalog_color(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_unused_catalog_color(uuid) TO service_role;

ALTER TABLE public.catalog_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_color_preset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_steps ENABLE ROW LEVEL SECURITY;
