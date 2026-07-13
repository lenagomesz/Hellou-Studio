# Auditoria de e-mails — Hellou Studio

Data da revisão: 13/07/2026

## Situação atual

| Fluxo | Cliente recebe hoje? | Momento | Observação |
|---|---|---|---|
| Mercado Pago — cartão — produto físico | Sim | Após aprovação | Usa a confirmação geral do pedido. |
| Mercado Pago — cartão — STL | Sim | Após aprovação | Recebe confirmação e mensagem específica de download. |
| Mercado Pago — PIX criado | Não por e-mail | Apenas notificação dentro da conta | O e-mail só é enviado quando o webhook confirma o pagamento. |
| Mercado Pago — PIX aprovado — produto físico | Sim | Após o webhook | Confirmação geral do pedido. |
| Mercado Pago — PIX aprovado — STL | Sim | Após o webhook | Confirmação geral e mensagem específica do STL. |
| Stripe — produto físico | Sim | Após `checkout.session.completed` | Confirmação geral do pedido. |
| Stripe — STL | Parcial | Após `checkout.session.completed` | A confirmação geral é enviada, mas falta o mesmo fluxo especializado de download usado no Mercado Pago. |
| Alteração de status | Sim | Quando o admin altera o status | Inclui produção, envio, entrega, cancelamento e reembolso. |
| Campanha criada no admin | Sim | Quando a campanha é disparada | O HTML livre ainda pode sair fora do padrão visual da marca. |

## Pontos que impedem uma garantia completa de entrega

1. Sem `RESEND_API_KEY`, as funções encerram sem enviar.
2. Erros do provedor são registrados no servidor, mas não existe histórico persistente de entrega no painel.
3. O PIX pendente não possui e-mail próprio com instruções e prazo.
4. O Stripe não executa o fluxo especializado de liberação do STL.
5. Campanhas com HTML personalizado não são obrigadas a usar o invólucro visual da marca.

## Alterações previstas após aprovação visual

- Um único sistema visual e estrutural para todos os e-mails.
- Templates específicos para pedido recebido, PIX aguardando pagamento, pagamento aprovado, produção, envio, entrega, STL liberado, solicitação de impressão, recuperação de senha, boas-vindas e comunicações administrativas.
- Campanhas sempre envolvidas pelo cabeçalho e rodapé oficiais, mantendo apenas o conteúdo central editável.
- Registro persistente de tentativa, sucesso, falha, destinatário, pedido e identificador do provedor.
- Idempotência para evitar mensagens duplicadas quando a criação do pagamento e o webhook ocorrerem quase ao mesmo tempo.
