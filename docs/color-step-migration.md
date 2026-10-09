# Migração da central de cores e etapas

1. Aplique `supabase/migrations/20261009_shared_customization_catalog.sql` antes de publicar o código da aplicação. A migração cria o cadastro global de cores, adiciona referências às variações atuais e às cores das seções JSON e cria os vínculos das etapas compartilhadas. Ela não remove seções exclusivas, variações, pedidos ou seleções antigas.

   Se uma tentativa anterior falhou com `column o.color_preset_item_id does not exist`, execute novamente o arquivo atualizado desde o início. Ele agora cria a coluna e a estrutura relacionada antes de usá-la; os comandos anteriores à falha podem ser executados novamente.
2. Confira as contagens após a migração:

   ```sql
   SELECT count(*) FROM public.catalog_colors;
   SELECT count(*) FROM public.product_options WHERE color IS NOT NULL AND catalog_color_id IS NULL;
   SELECT count(*) FROM public.product_customization_steps;
   ```

   O último resultado começa em zero: as seções existentes permanecem exclusivas até serem intencionalmente substituídas por vínculos compartilhados no editor do produto. Variações sem `catalog_color_id` podem ter valores legados sem hexadecimal nem nome correspondente a uma cor cadastrada; revise esses casos na central.
3. Publique o código e teste uma cor em dois produtos, uma etapa exclusiva, um bloqueio individual e a reativação global. A loja consulta a disponibilidade global em cada carregamento da página do produto, no carrinho e no checkout. A inserção do item no pedido também verifica a disponibilidade da variação comercial na transação.

**Dados legados:** versões anteriores gravavam `product_options.active = false` quando um item de paleta era inativado. Não há como distinguir com segurança essa alteração de um bloqueio individual intencional. A migração preserva o valor atual. Para variações que deveriam voltar automaticamente, revise e reative apenas o `active` local após a migração; mudanças globais futuras não sobrescrevem esse campo.

## Substituição de cores e acompanhamento

Depois da migração acima, aplique `supabase/migrations/20261010_catalog_color_merge.sql` no SQL Editor. Ela instala as operações transacionais de substituição e exclusão de cores sem uso. A central permite escolher uma cor de destino: os vínculos das variações, dos grupos e das etapas passam a apontar para ela, e a cor de origem é removida. Estoque, preços e registros de pedidos não são alterados. Se duas escolhas já estavam na mesma etapa, revise essa etapa: os IDs das escolhas são preservados para não invalidar seleções existentes.

Na aba **Produtos · padronização**, selecione uma etapa compartilhada, confira a cobertura entre produtos ativos e personalizáveis, filtre os que ainda não a usam e vincule a etapa aos produtos selecionados. O vínculo em lote não apaga etapas exclusivas; a lista destaca produtos que precisam de revisão para evitar perguntas repetidas na loja.
