# Kits e complementos do carrinho

Os kits aparecem na Home, em `/kits` e pelo atalho do catálogo. A composição está em `lib/product-kits.ts` (`KIT_DEFINITIONS`): cada grupo de nomes identifica uma peça, com alternativas em ordem de preferência. Ajuste essa lista ao renomear produtos ou alterar a curadoria. Não são novos registros de produto nem há alteração de preços no banco.

- Setup & Estudo: suporte de headset, fidget espiral (ou Infinity Cube) e chaveiro clicker.
- Penteadeira com Charme: organizador coração (ou de maquiagem), lip balm e mochilhinha com gatinho.
- Meu Cantinho: vaso Curvas Modernas e lip balm.

Apenas produtos físicos ativos, de varejo e fora de encomendas privadas entram na seleção. Peças de pronta entrega precisam ter uma variação ativa com estoque. Um kit só aparece completo, nunca com uma peça substituída por um produto aleatório. Sem acesso ao catálogo ou sem uma das peças, a página mostra indisponibilidade.

O preço inicial soma uma unidade de cada item, usando o preço promocional quando existir e o menor acréscimo de uma variação ativa disponível. Não existe desconto adicional de kit. O cliente configura cada peça no mesmo formulário do produto e adiciona os itens individualmente ao carrinho existente. Interromper a montagem não remove itens já adicionados; recarregar a página reinicia as etapas, não o carrinho. Antes de reiniciar uma montagem, confira o carrinho para evitar duplicar itens.

O frete usa `commerce.freeShippingThreshold` das configurações da loja. Os cálculos de exibição usam centavos: R$ 96,70 ainda precisa de R$ 2,30 para atingir R$ 99; R$ 89,90 + R$ 6,90 não atinge o limite. As recomendações excluem itens já no carrinho e priorizam o produto mais barato cujo preço inicial completa o valor restante. Carrinhos digitais não recebem essas sugestões.

O link de Kits está na navegação padrão. Se a loja já salvou uma navegação personalizada, adicione `/kits` nas configurações de navegação; os links da Home e do catálogo não dependem dessa configuração.

Não há dados fictícios no catálogo de produção. Os exemplos de teste ficam em `tests/fixtures/kit-products.ts`.
