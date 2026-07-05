# 🧪 Teste STL Passo a Passo - Para Debugar

## Antes de Começar
1. Verifique `.env.local` tem:
   ```
   RESEND_API_KEY=re_xxxxx...
   ADMIN_EMAIL=studiohellou@gmail.com
   ```

2. Abra terminal e rode:
   ```bash
   npm run dev
   ```

3. Abra 2 abas:
   - Uma para testar (app)
   - Uma para ver logs do servidor

---

## Teste 1: Compra de STL Puro

### Passos
1. Acesse `http://localhost:3000/stl`
2. Clique em um arquivo STL
3. Clique "Adicionar ao Carrinho"
4. Vá para `http://localhost:3000/cart`
5. Verifique:
   - ✅ Campo de endereço **oculto** (não precisa)
   - ✅ Campo de frete **oculto**
   - ✅ Botão de pagamento está presente
6. Clique "Gerar Pagamento" ou "Confirmar Pedido"

### Esperado
- Vê tela PIX QR Code ou tela de sucesso
- **No console do servidor**, vê logs:
  ```
  [mp-create] Payment created: { paymentId: 'xxx', status: 'approved', ... }
  [mp-create] Order status set: { isDigitalOrder: true, orderStatus: 'delivered' }
  [mp-create] STL items found: { stlCount: 1, shouldSendEmail: true }
  [email] stl-delivery ENVIADO para: seu@email.com | id: xxx
  ```

### Se Falhar
- **Não vê logs** → Pagamento não foi processado
- **Vê "ERRO"** → Erro específico no log (copie e me mostre)
- **Vê "ENVIADO" mas email não chega** → Verifique spam do Gmail

---

## Teste 2: Após Pagamento

### Se viu tela de sucesso
1. Clique "Ver meus pedidos"
2. Selecione o pedido criado
3. Verifique:
   - ✅ Status mostra "Entregue"
   - ✅ Botão "📥 Baixar Arquivo" está **ativo** (não cinza)
   - ✅ Campo de rastreamento **oculto**

### Se status está errado
1. Verifique no banco (Supabase):
   ```sql
   SELECT id, status, mp_status FROM orders 
   ORDER BY created_at DESC LIMIT 1;
   ```
   - Se status = 'delivered' → Banco OK
   - Se status ≠ 'delivered' → Problema no código

2. Limpe cache Next.js:
   ```bash
   rm -rf .next
   npm run dev
   ```

---

## Teste 3: Download do Arquivo

### Se botão está ativo
1. Clique "📥 Baixar Arquivo"
2. Arquivo .stl deve baixar automaticamente
3. Verifique nome: `seu_arquivo.stl`

### Se diz "Indisponível"
- Significa status não é 'delivered'
- Veja Teste 2 acima

### Se clica e nada acontece
- Verifique DevTools → Console (aba do cliente)
- Se tem erro, copie e me mostre

---

## Teste 4: Email

### Para testar se email é enviado
1. Use email fake: https://guerrillamail.com
2. Use esse email no cadastro/login
3. Faça pagamento
4. Verifique inbox do email fake

### Se email não chega
1. Verifique logs do servidor:
   ```
   [email] stl-delivery ENVIADO para: ...
   ```
   - Sem esse log → RESEND_API_KEY não configurado

2. Se vê "ENVIADO" mas email não chega:
   - Spam do Gmail
   - Ou RESEND_API_KEY inválida

---

## Teste 5: Carrinho Vazio Após Pagamento

### Esperado
- Após fazer pagamento, carrinho vazio
- Página `/cart` mostra "Seu carrinho está vazio"

### Se carrinho não esvazia
1. Abra DevTools → Storage → Local Storage
2. Procure por "cart"
3. Se tem algo, é localStorage que não foi limpo
4. Solução:
   - Limpe: `localStorage.removeItem('cart')`
   - Recarregue página
   - Tente pagamento novamente

---

## Comandos Úteis

### Ver status de um pedido
```sql
-- Supabase
SELECT id, status, mp_status, created_at, user_id
FROM orders
ORDER BY created_at DESC
LIMIT 5;
```

### Ver se email foi enviado
```bash
# Terminal, procure por:
grep "stl-delivery" <(npm run dev 2>&1)
```

### Limpar cache de build
```bash
rm -rf .next
npm run dev
```

### Ver logs de um pagamento específico
```bash
npm run dev 2>&1 | grep "[mp-create]"
```

---

## Se Tudo Falhar

1. **Copie** os logs do servidor (npm run dev)
2. **Mostre**:
   - Logs com "[mp-create]"
   - Logs com "[email]"
   - Status do banco de dados
3. Eu correio o código

---

## Checklist Rápido

- [ ] RESEND_API_KEY configurado em `.env.local`
- [ ] npm run dev rodando
- [ ] Campo endereço oculto para STL
- [ ] Pagamento processado
- [ ] Logs mostram "ENVIADO"
- [ ] Status virou 'delivered' no banco
- [ ] Download button ativo
- [ ] Email chega
- [ ] Carrinho vazio após pagamento
