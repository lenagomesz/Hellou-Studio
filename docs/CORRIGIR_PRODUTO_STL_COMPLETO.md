# 🔧 Corrigir Produto STL - Guia Completo

## **O Problema:**

O produto foi inserido na tabela `products` MAS:
- ❌ Está aparecendo no **Catálogo** (página normal)
- ❌ **Não aparece** na página STL
- ❌ Falta a segunda imagem (transição preto/branco → rosa)
- ❌ Arquivo STL não está vinculado

**Motivo:** A tabela `products` não tinha as colunas `type`, `image_url_2` e `file_path`

---

## **Solução em 2 Passos:**

### **Passo 1: Adicionar as Colunas (MIGRATION)**

1. Abra: `scripts/MIGRATION_ADICIONAR_COLUNAS.sql`
2. Copie o conteúdo
3. Supabase Dashboard → SQL Editor → New Query
4. Cole e clique **"Run"**

**Resultado esperado:**
```
Query executed successfully
```

---

### **Passo 2: Corrigir o Produto**

1. Abra: `scripts/CORRIGIR_PRODUTO_STL.sql`
2. Copie o conteúdo
3. Supabase Dashboard → SQL Editor → New Query
4. Cole e clique **"Run"**

**Resultado esperado:**
```
Query executed successfully
```

---

## **✅ Pronto!**

Agora acesse: **http://localhost:3000/stl**

Você verá:
- 📸 Produto aparecendo **APENAS** na página STL
- 🎨 Imagem 1 (preto/branco) como principal
- 🖱️ Ao passar o mouse, transiciona para Imagem 2 (rosa)
- 💾 Arquivo STL disponível para download

---

## **Verificar se funcionou:**

1. Vá para **http://localhost:3000/products** (Catálogo normal)
   - ❌ O produto **NÃO deve aparecer** lá

2. Vá para **http://localhost:3000/stl**
   - ✅ O produto **deve aparecer** com as 2 imagens

---

## **Se Algo Não Funcionar:**

### ❌ Produto ainda aparece no Catálogo
**Solução:** Limpe o cache (Ctrl+Shift+Delete) e atualize a página (F5)

### ❌ Produto não aparece em /stl
**Solução:** Verifique se o script de correção rodou sem erros

### ❌ Imagens não transicionam
**Solução:** Confirme que `image_url_2` foi preenchida corretamente

### ❌ Dark mode está estranho
**Solução:** As classes `dark:` estão todas corretas. Tente:
1. Pressione Ctrl+Shift+Delete (limpar cache)
2. Atualize a página (F5)
3. Toggle o tema claro/escuro 2x

---

## **Scripts Prontos:**

| Script | Função |
|--------|--------|
| `MIGRATION_ADICIONAR_COLUNAS.sql` | Adiciona as colunas faltando |
| `CORRIGIR_PRODUTO_STL.sql` | Atualiza o produto com dados corretos |

**Execute na ordem:**
1. MIGRATION_ADICIONAR_COLUNAS
2. CORRIGIR_PRODUTO_STL

