-- Explicitly remove a color even when it is used. Commercial variations are
-- deactivated rather than deleted so existing orders retain their references.
CREATE OR REPLACE FUNCTION public.remove_catalog_color_choices(
  p_colors jsonb, p_color_id uuid, p_hex text
) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(color ORDER BY position) FILTER (WHERE (
    color->>'colorId' = p_color_id::text
    OR (color->>'colorId' IS NULL AND upper(color->>'value') = p_hex)
  ) IS NOT TRUE), '[]'::jsonb)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_colors) = 'array' THEN p_colors ELSE '[]'::jsonb END)
    WITH ORDINALITY AS choices(color, position);
$$;

CREATE OR REPLACE FUNCTION public.delete_catalog_color_everywhere(p_color_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_color public.catalog_colors%ROWTYPE;
  v_product record;
  v_step record;
  v_sections jsonb;
  v_definition jsonb;
  v_options integer := 0;
  v_presets integer := 0;
  v_products integer := 0;
  v_steps integer := 0;
BEGIN
  SELECT * INTO v_color FROM public.catalog_colors WHERE id = p_color_id FOR UPDATE;
  IF v_color.id IS NULL THEN RAISE EXCEPTION 'Cor não encontrada.'; END IF;

  UPDATE public.product_options
  SET active = false, catalog_color_id = NULL, color_preset_item_id = NULL
  WHERE catalog_color_id = p_color_id
     OR (catalog_color_id IS NULL AND upper(color) = v_color.hex)
     OR color_preset_item_id IN (
       SELECT id FROM public.product_option_color_preset_items
       WHERE catalog_color_id = p_color_id OR (catalog_color_id IS NULL AND upper(hex) = v_color.hex)
     );
  GET DIAGNOSTICS v_options = ROW_COUNT;

  DELETE FROM public.product_option_color_preset_items
  WHERE catalog_color_id = p_color_id OR (catalog_color_id IS NULL AND upper(hex) = v_color.hex);
  GET DIAGNOSTICS v_presets = ROW_COUNT;

  FOR v_product IN SELECT id, customization_sections FROM public.products
    WHERE jsonb_typeof(customization_sections) = 'array'
  LOOP
    SELECT coalesce(jsonb_agg(
      CASE WHEN jsonb_typeof(section->'colors') = 'array' THEN
        jsonb_set(section, '{colors}', public.remove_catalog_color_choices(section->'colors', p_color_id, v_color.hex))
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
    v_definition := jsonb_set(v_step.definition, '{colors}', public.remove_catalog_color_choices(
      v_step.definition->'colors', p_color_id, v_color.hex));
    IF v_definition IS DISTINCT FROM v_step.definition THEN
      UPDATE public.customization_steps SET definition = v_definition, updated_at = now() WHERE id = v_step.id;
      v_steps := v_steps + 1;
    END IF;
  END LOOP;

  DELETE FROM public.catalog_colors WHERE id = p_color_id;
  RETURN jsonb_build_object('deactivatedOptions', v_options, 'removedPresetItems', v_presets,
    'products', v_products, 'steps', v_steps);
END;
$$;

REVOKE ALL ON FUNCTION public.remove_catalog_color_choices(jsonb, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_catalog_color_everywhere(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_catalog_color_choices(jsonb, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_catalog_color_everywhere(uuid) TO service_role;

ALTER TABLE public.catalog_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_color_preset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_steps ENABLE ROW LEVEL SECURITY;
