# 🐛 Debug - Problemas STL (Carrinho, Email, Status)

## Problema 1: Carrinho Não Esvazia Após Pagamento

### Causa Possível
- Página não recarregando após pagamento
- localStorage contém itens antigos

### Solução
```typescript
// Após pagamento bem-sucedido, o sistema deve:
1. Deletar cart_items do banco (linha 249 em create/route.ts) ✅
2. Limpar localStorage do cliente
3. Redirecionar para página de pedidos
```

### Verificar
1. Abra DevTools → Console
2. Execute: `localStorage.getItem('cart')`
3. Se retornar algo, execute: `localStorage.removeItem('cart')`
4. Recarregue a página

### Fix Automático
Vou adicionar limpeza de localStorage no frontend após pagamento ✅

---

## Problema 2: Email Não Chega

### Causas Possíveis
1. **RESEND_API_KEY não configurada**
   - Verifique `.env.local` contém `RESEND_API_KEY=...`
   - Sem isso, os emails são logados mas não enviados

2. **Email está sendo enviado mas vai para spam**
   - Verifique pasta de spam/promoção no Gmail

3. **Função `sendSTLDeliveryEmail` não está sendo chamada**
   - Verifique console do servidor para logs

### Debug
```bash
# 1. Verifique se RESEND_API_KEY está configurado
echo $RESEND_API_KEY

# 2. Rode servidor e faça um pagamento
npm run dev

# 3. Verifique console:
# - [email] stl-delivery ENVIADO para: user@email.com | id: xxx
# - Significa email foi enviado com sucesso

# 4. Verifique logs para erros:
# - [email] stl-delivery ERRO: ...
# - [mp-create] stl delivery email error: ...
```

### Environment Variables Necessárias
```env
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=helloustudio <noreply@resend.dev>
```

---

## Problema 3: Status Não Muda na Página de Pedidos

### Causa
- Página está em cache (Next.js static generation)
- Precisa de `force-dynamic` ou revalidação

### Verificar Status no Banco
```sql
-- Supabase SQL Editor
SELECT id, status, mp_status, created_at 
FROM orders 
WHERE user_id = 'SEU_USER_ID' 
ORDER BY created_at DESC 
LIMIT 5;
```

Se o status está 'delivered' no banco mas não mostra na página:
- A página está cacheada

### Solução
Já implementado em `/account/orders/[id]/page.tsx`:
```typescript
export const dynamic = 'force-dynamic';
```

Se ainda não funciona:
```bash
# 1. Limpe cache de build
rm -rf .next

# 2. Recompile
npm run build

# 3. Rode dev
npm run dev
```

---

## Problema 4: Download Diz "Order not ready for download"

✅ **CORRIGIDO** - Agora mostra em português:
- "O pedido ainda não foi entregue. Aguarde o email de confirmação."

---

## Logs de Debug para Verificar

Quando você faz um pagamento, veja o console do servidor para:

```
[mp-create] Payment created: {
  paymentId: 'xxx',
  status: 'approved',
  itemCount: 1
}

[mp-create] Order status set: {
  mpStatus: 'approved',
  isDigitalOrder: true,
  orderStatus: 'delivered'
}

[mp-create] STL items found: {
  stlCount: 1,
  mpStatus: 'approved',
  shouldSendEmail: true
}

[email] stl-delivery ENVIADO para: user@email.com | id: xxx
```

Se não vir `ENVIADO`, o email não está sendo enviado!

---

## Checklist de Debug

- [ ] Verificar `.env.local` tem `RESEND_API_KEY`
- [ ] Fazer pagamento e verificar console do servidor
- [ ] Verificar se tem log `[email] stl-delivery ENVIADO`
- [ ] Se sim, verificar spam no Gmail
- [ ] Se não, verifique erro `[email] stl-delivery ERRO`
- [ ] Limpar localStorage e recarregar
- [ ] Limpar cache Next.js (rm -rf .next)
- [ ] Recompile e teste novamente

---

## Próximas Correções Automáticas

✅ Download button agora valida status
✅ Mensagens em português
✅ Logs de debug adicionados

Em progresso:
- [ ] Limpar localStorage após pagamento
- [ ] Adicionar reload automático após 3 segundos
- [ ] Melhorar validação de status
