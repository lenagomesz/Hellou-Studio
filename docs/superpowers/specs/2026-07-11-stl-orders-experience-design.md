# Design: Experiência STL e Notificações Personalizadas

**Data:** 2026-07-11  
**Autor:** Claude Code  
**Status:** Design Aprovado

---

## Resumo Executivo

Três melhorias coordenadas para pedidos STL e notificações:

1. **Página de sucesso do checkout** — textos e cards adaptados ao tipo de pedido (STL-only, produtos físicos, ou ambos)
2. **Emails e status automáticos** — STL disparado imediatamente no 'approved', status muda para 'delivered' quando baixado
3. **Notificações personalizadas** — textos diferentes para cada tipo de compra no ícone de sininho
4. **Emails de produtos melhorados** — mais contexto, timeline visual, mobile-first
5. **Notificação por email ao admin mudar status** — cliente notificado de mudanças no painel

**Público:** Clientes mobile-first, admin  
**Paleta:** Manter existente (gradiente pink/orange, cores de status)

---

## Problema

Atualmente:
- ❌ Página de sucesso genérica para todos os pedidos (confunde STL com produtos físicos)
- ❌ Email de STL não é disparado para o cliente (só para admin)
- ❌ Status não muda para 'delivered' quando STL é disponibilizado
- ❌ Notificações não diferenciam tipos de compra
- ❌ Emails de produtos podem ter mais contexto
- ❌ Admin mudando status no painel não notifica cliente por email

---

## Solução: 6 Mudanças Coordenadas

### 1. Página de Sucesso do Checkout (CheckoutSuccessPage)

**Arquivo:** `app/(shop)/checkout/success/page.tsx`

**Lógica:**
```
1. Extrair order_id dos searchParams
2. Buscar order com relação items:product
3. Detectar se isDigitalOnly = todos items têm product.type === 'digital'
4. Renderizar cards de progresso baseado no tipo
```

**Cards de Progresso — 3 variações:**

**Variação A: STL-only**
```
✓ Pagamento recebido (verde)
📥 Arquivo disponível (verde)
(sem 3º card)

Título: "Seu arquivo está pronto!"
Descrição: "Acesse sua conta para fazer download do seu arquivo STL."
```

**Variação B: Produtos Físicos**
```
✓ Pagamento recebido (verde)
🖨️ Produção iniciada (cinza)
📦 Envio (cinza)

Título: "Pedido confirmado!"
Descrição: "Sua peça será impressa em até 3 dias úteis."
```

**Variação C: STL + Produtos**
```
✓ Pagamento recebido (verde)
🖨️ Produção iniciada (cinza)
📦 Envio (cinza)

Título: "Arquivo pronto + Pedido em produção!"
Descrição: "Seu arquivo STL está disponível. A peça será impressa em até 3 dias úteis."
```

**Botões de ação (mantém responsividade mobile):**
- CTA primária: "Ver meus pedidos" (leva para `/account/orders`)
- CTA secundária: "Continuar comprando" (leva para `/products`)

---

### 2. Email e Status Automático para STL

**Arquivo:** `app/api/webhooks/mercadopago/route.ts`

**Fluxo webhook quando pagamento é aprovado:**
```
1. Detectar se pedido é STL-only
2. Se isDigitalOrder = true:
   - status = 'approved' (já faz isso)
   - Dispara sendSTLOrderConfirmationEmail IMEDIATAMENTE
   - Log: '[mp-webhook] STL order confirmed, email sent'
3. Se isDigitalOrder = false:
   - status = 'processing'
   - Dispara sendOrderConfirmationEmail
```

**Reutilizar funções existentes:**
- `sendSTLOrderConfirmationEmail` (já existe, está em `lib/email.ts`)
- `sendSTLDeliveryEmail` (já existe, para quando status muda para 'delivered')

---

### 3. Mudança de Status no DownloadButton

**Arquivo:** `app/(shop)/account/orders/[id]/DownloadButton.tsx`

**Lógica ao clicar:**
```
1. Se status === 'approved' AND isDigitalOrder:
   - Chamar PATCH /api/orders/{id} com { status: 'delivered' }
   - Aguardar confirmação
   - Disparar sendSTLDeliveryEmail no backend
   - Log: '[download] STL order marked as delivered'
2. Fazer download normalmente
```

**Resposta do PATCH:**
```json
{
  "success": true,
  "status": "delivered",
  "message": "Status atualizado e email de confirmação enviado"
}
```

---

### 4. Notificações Personalizadas (Ícone de Sininho)

**Arquivo:** `app/api/webhooks/mercadopago/route.ts`

**Lógica de criação de notificação quando status muda:**

```javascript
// Ao aprovar pagamento (newStatus === 'approved' || 'processing')
const hasDigitalItems = items.some(i => i.product?.type === 'digital');
const hasPhysicalItems = items.some(i => i.product?.type !== 'digital');

let notificationTitle = '';
let notificationBody = '';

if (hasDigitalItems && !hasPhysicalItems) {
  // STL-only
  notificationTitle = '✨ Seu arquivo STL está pronto!';
  notificationBody = 'Acesse sua conta para fazer download do arquivo';
} else if (!hasDigitalItems && hasPhysicalItems) {
  // Produtos físicos
  notificationTitle = '🎉 Pedido aprovado!';
  notificationBody = 'Sua peça será impressa em até 3 dias úteis';
} else {
  // STL + Produtos
  notificationTitle = '📦 Arquivo pronto + Pedido em produção!';
  notificationBody = 'Seu arquivo está disponível. A peça será impressa em até 3 dias úteis.';
}

await createNotification(
  order.user_id,
  'order_status',
  notificationTitle,
  notificationBody,
  { order_id: order.id, event: 'order_approved' }
);
```

**Ícone de sininho:**
- Exibe todas as notificações (já faz isso)
- Mobile: dropdown responsivo mantendo paleta do site
- Desktop: mesmo comportamento

---

### 5. Emails de Produtos — Melhorias

**Arquivo:** `emails/pedido-confirmado.tsx`

**Alterações:**

1. **Header aprimorado:**
   - Logo/marca da loja
   - Saudação personalizada

2. **Resumo do pedido:**
   - ID do pedido (#XXXXXXXX)
   - Data/hora
   - Total formatado

3. **Itens com mais detalhes:**
   - Thumbnail da imagem
   - Nome do produto
   - Cor/opção selecionada
   - Quantidade e preço unitário
   - Subtotal do item

4. **Timeline visual:**
   ```
   ✓ Pagamento confirmado
   → Produção (2-3 dias)
   → Envio (1-3 dias)
   → Entrega
   ```

5. **Texto de contexto:**
   - "Sua peça será impressa em alta qualidade..."
   - "Em breve você receberá o código de rastreamento..."

6. **CTAs:**
   - Primária: "Acompanhe seu pedido" (link para `/account/orders/{id}`)
   - Secundária: "Voltar à loja"

7. **Footer:**
   - Links para FAQ, contato, suporte
   - Endereço de retirada (se houver)

**Mobile-first:**
- Imagens responsivas (max-width 480px)
- Texto legível em qualquer tela
- Botões com área de clique >= 44px (mobile)

---

### 6. Notificação por Email ao Admin Mudar Status

**Arquivo:** `app/api/admin/orders/route.ts` (criar ou atualizar PATCH se não existir)

**Endpoint:** `PATCH /api/admin/orders/{id}`

**Body:**
```json
{
  "status": "processing" | "shipped" | "delivered" | "canceled"
}
```

**Lógica:**
```
1. Validar user é admin
2. Buscar pedido
3. Se status === 'shipped' e existe trackingCode:
   - Dispara sendOrderStatusEmail com tracking
4. Se status === 'delivered':
   - Dispara sendOrderStatusEmail
5. Se status === 'canceled':
   - Dispara sendOrderStatusEmail
6. NÃO dispara se for STL já em 'delivered'
7. Atualiza status no banco
8. Retorna { success: true, status: newStatus }
```

**Reutilizar:**
- `sendOrderStatusEmail` (já existe em `lib/email.ts`)

**Melhorias ao template:**
- Se `status === 'shipped'` e `trackingCode`: mostrar código de rastreamento com link Correios
- Se `status === 'delivered'`: mensagem de confirmação de entrega
- Se `status === 'canceled'`: motivo de cancelamento (opcional)

---

## Fluxos de Dados

### Fluxo 1: Compra STL-only

```
1. Cliente paga via MercadoPago
2. Webhook recebe payment.updated (approved)
3. Webhook detecta isDigitalOnly = true
   → status = 'approved'
   → sendSTLOrderConfirmationEmail ✉️
   → createNotification('✨ Seu arquivo STL está pronto!')
4. Cliente vê página de sucesso: "Seu arquivo está pronto!"
5. Cliente acessa /account/orders/{id}
6. Cliente clica em DownloadButton
7. PATCH /api/orders/{id} { status: 'delivered' }
   → sendSTLDeliveryEmail ✉️
   → Status = 'delivered'
8. Download do arquivo
```

### Fluxo 2: Compra de Produtos Físicos

```
1. Cliente paga via MercadoPago
2. Webhook recebe payment.updated (approved)
3. Webhook detecta isDigitalOnly = false
   → status = 'processing'
   → sendOrderConfirmationEmail ✉️ (email melhorado com itens + timeline)
   → createNotification('🎉 Pedido aprovado!')
4. Cliente vê página de sucesso com "Produção iniciada"
5. Admin no painel muda status → 'shipped' com tracking
   → sendOrderStatusEmail com tracking code ✉️
   → createNotification('📦 Seu pedido foi enviado!')
6. Admin muda status → 'delivered'
   → sendOrderStatusEmail ✉️
   → createNotification('✅ Seu pedido foi entregue!')
```

### Fluxo 3: Compra STL + Produtos

```
1. Cliente paga via MercadoPago
2. Webhook recebe payment.updated (approved)
3. Webhook detecta hasDigitalItems = true, hasPhysicalItems = true
   → status = 'processing'
   → sendOrderConfirmationEmail ✉️ (com itens digitais + físicos)
   → createNotification('📦 Arquivo pronto + Pedido em produção!')
4. Cliente vê página de sucesso: "Arquivo pronto + Produção iniciada"
5. Cliente clica em DownloadButton → STL muda para 'delivered' (já mencionado)
6. Admin muda status do pedido → 'shipped'
   → sendOrderStatusEmail ✉️
   → createNotification('📦 Seu pedido foi enviado!')
```

---

## Arquivos a Alterar/Criar

### Alterar:
- ✏️ `app/(shop)/checkout/success/page.tsx` — adicionar lógica condicional
- ✏️ `app/api/webhooks/mercadopago/route.ts` — melhorar notificações
- ✏️ `emails/pedido-confirmado.tsx` — enriquecer template
- ✏️ `app/(shop)/account/orders/[id]/DownloadButton.tsx` — integração com status
- ✏️ `app/api/admin/orders/route.ts` — adicionar PATCH ou melhorar existente

### Reutilizar (já existem):
- `lib/email.ts` → `sendSTLOrderConfirmationEmail`
- `lib/email.ts` → `sendSTLDeliveryEmail`
- `lib/email.ts` → `sendOrderStatusEmail`
- `lib/notifications.ts` → `createNotification`

---

## Considerações de Implementação

### Database
Nenhuma migração necessária. Campos existentes:
- `orders.status` (string enum)
- `order_items.product.type` ('digital' ou null/outro)
- `users.email`, `users.name`

### Emails
Usar funções existentes de `lib/email.ts`. Potencial refactor:
- Extrair template base para emails (header, footer)
- Criar utility para renderizar itens do pedido

### Notificações
Lógica de criação em um único lugar (webhook). Facilita manutenção.

### Mobile
- Página de sucesso: cards em grid responsivo (já faz)
- Emails: width max 480px (já faz)
- Notificações: dropdown responsivo

### Testes
- [ ] Webhook STL-only → aprova, envia email, cria notificação
- [ ] Webhook produtos → aprova, envia email, cria notificação
- [ ] Webhook STL + produtos → aprova, envia email, cria notificação
- [ ] DownloadButton STL → muda status, envia email
- [ ] Admin muda status → envia email cliente
- [ ] Página sucesso renderiza cards corretos (3 variações)

---

## Timing e Prioridades

1. **Fase 1 (crítica):** Página de sucesso + emails STL para cliente + notificações
2. **Fase 2 (importante):** Emails de produtos melhorados + status automation
3. **Fase 3 (nice-to-have):** Admin email notifications

---

## Notas de Aprovação

✅ Textos adaptados por tipo de compra  
✅ Email disparado imediatamente no 'approved'  
✅ Status muda para 'delivered' quando download  
✅ Notificações personalizadas no sininho  
✅ Emails de produtos enriquecidos  
✅ Admin notificado quando muda status  
✅ Mobile-first, mantém paleta/fontes existentes

