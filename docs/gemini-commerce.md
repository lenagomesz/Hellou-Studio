# Gemini no catálogo e no atendimento

## Ativação

1. Aplique **somente** `supabase/migrations/20260828_product_ai_seo.sql` no Supabase SQL Editor, seguindo `supabase/README.md`. A migração é aditiva: não apaga produtos nem substitui SEO. Não execute `supabase db push` neste projeto.
2. Configure no servidor `GOOGLE_GENAI_API_KEY`, `GOOGLE_GENAI_MODEL` (padrão `gemini-3.6-flash`), `CRON_SECRET` e as variáveis Supabase/NextAuth já usadas pela loja. Nunca use prefixo `NEXT_PUBLIC_` para a chave Gemini. A chave não é incluída no JavaScript do navegador.
3. Publique a aplicação pelo fluxo Vercel existente. A migração deve preceder a publicação, pois a busca passa a consultar `seo_search_text`.
4. Abra **Produtos → SEO com IA**. Confira a configuração e processe os primeiros lotes, revisando os resultados nos produtos.

Esta implementação não executa migrações, não publica em produção e não consome a API real durante os testes automatizados. A geração de conteúdo pode ter custos conforme o plano da API.

## Cadastro e revisão

- **Produtos → Novo produto**: envie a foto na seção de imagens e/ou digite palavras-chave em “Cadastro com Gemini”. A geração não exige peso nem tempo.
- O resultado é um rascunho: preenche os campos vazios ao aplicar. Substituir textos existentes exige marcar uma opção explícita. Nenhuma imagem, variação ou produto é removido.
- A sugestão de preço é opcional e calculada pelo código a partir de peso/tempo informados, não estimados pela imagem. A fórmula atual da loja é mostrada na interface e não inclui frete, impostos ou taxas de pagamento. Aplicar preço exige um botão separado.
- Palavras-chave ficam em `seo_keywords` e participam da busca interna. As tags visuais preexistentes continuam separadas e não são removidas.
- Os textos alternativos ficam em `image_alt_texts`, indexados por URL para não se trocarem ao reordenar fotos. São usados na galeria e nos cartões.

## SEO automático e catálogo existente

- A migração enfileira todos os produtos existentes, exceto encomendas privadas. O gatilho também captura cadastros e alterações vindos de importações, edição em lote e arquivos STL.
- Os editores físico e STL iniciam o processamento após responder ao salvamento. Falhas de IA não impedem o cadastro manual. Importações e alterações em lote permanecem na fila até o processamento manual/diário.
- A tarefa Vercel `/api/cron/product-seo` roda diariamente às 10:00 UTC, protegida por `CRON_SECRET`, processando até **3 produtos por execução**. Para acelerar um catálogo grande, use os lotes manuais (até 30 lotes/hora) ou ajuste a frequência conforme o plano de hospedagem e o orçamento da API.
- A fila usa bloqueio transacional e lease de 10 minutos; máximo de 3 tentativas. Sem chave, não consome tentativas. Após falhas persistentes, corrija a configuração e use “Reenviar para a fila”. O reenvio só é permitido após expirar a tentativa em andamento.
- Só campos vazios ou ainda iguais ao último texto gerado automaticamente podem ser atualizados. Edições manuais posteriores são preservadas individualmente. Ao aplicar e revisar um rascunho no editor, os textos salvos são tratados como editoriais.
- Alterar um produto durante a geração invalida o resultado antigo por revisão da fila. O worker não muda nome, descrição comercial, slug, preços, status ou tags visuais.
- Metadados continuam com fallback local (nome/descrição), sem chamadas à IA na visita de clientes ou robôs.
- Análise visual lê apenas o bucket `products` configurado, incluindo URLs locais `/api/product-images/product-images/...`. URLs externas não são buscadas pelo servidor. Imagens inacessíveis, formatos não aceitos ou acima dos limites são ignorados; revise seu alt manualmente ou reenvie pelo editor. Máximo de 6 imagens e 12 MB combinados por geração.

## Presentes

O balão da Home abre o chat já existente. A busca consulta o catálogo ativo por interesses e palavras-chave, selecionando até 40 candidatos. A resposta traz até 3 cartões: IDs, preços e links são validados no servidor. Arquivos digitais e encomendas privadas não entram como presentes físicos. Orçamento explícito e disponibilidade de pronta entrega são filtrados. A conversa pergunta o que falta; a IA não pode modificar pedidos ou efetuar compras. Limite de 30 mensagens/hora por origem.

## Encomendas STL

Após selecionar um arquivo, clientes autenticados recebem uma pré-análise (até 3 MB / 50 mil triângulos), com seleção de unidade, dimensões e volume geométrico quando as bordas/orientações permitem. Suporta STL ASCII e binário, inclusive cabeçalhos binários começando com `solid`.

O arquivo bruto não vai ao Gemini: apenas o resumo geométrico. Se a IA falhar, as medidas continuam disponíveis. A análise não é fatiamento nem aprovação técnica: não verifica espessuras, auto-interseções, resistência ou segurança; não infere material, consumo real, preço ou tempo. Arquivos maiores continuam no envio manual existente. Limite de 10 análises/hora por usuário/origem.

## Depoimentos

Em **Inteligência Artificial → Resumir depoimento real**, cole o original após remover dados pessoais e confirmar autorização. Requer `reviews.manage`. A ferramenta gera uma paráfrase para comparação com o original, não uma citação literal. Não publica, não altera avaliações, não cria estrelas, selos nem compras verificadas. O texto não é salvo pelo aplicativo; é enviado ao provedor para processamento. Limite de 10 resumos/hora.

## Verificação

Execute `npm run lint`, `npm run typecheck`, `npm run db:check`, `npm run test:run` e `npm run build`. Os testes novos verificam preservação de SEO, controle de concorrência pelo contrato da fila, limites de entrada, permissões, falhas da API, URLs de imagem, recomendações restritas ao catálogo e geometria STL. A migração precisa de validação no banco de homologação antes da produção.

Referências da integração: [saída estruturada do Gemini](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) e [análise de imagens](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding). O projeto preserva o SDK já instalado; schema JSON e imagens são enviados juntos, e a resposta é validada novamente no servidor.
