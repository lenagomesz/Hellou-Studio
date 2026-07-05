# 🚀 Como Executar o Script SQL no Supabase

## **Passo 1: Abrir o Supabase Dashboard**

1. Acesse: https://app.supabase.com
2. Clique no seu projeto: **ecommerce-3d** (ou o nome do seu projeto)

---

## **Passo 2: Ir para SQL Editor**

1. No menu lateral esquerdo, clique em **SQL Editor** (ícone de banco de dados)
2. Clique em **"New Query"** (botão azul no topo)

---

## **Passo 3: Colar o Script**

1. Copie TODO o conteúdo do arquivo: `scripts/INSERT_PRODUTO_STL_PRONTO.sql`

2. Cola a tela em branco do SQL Editor (que deve estar vazio)

**Você deverá ver algo assim:**

```sql
INSERT INTO products (
  name,
  description,
  price,
  type,
  category,
  image_url,
  image_url_2,
  file_path,
  created_at,
  updated_at
) VALUES (
  'Chaveiro Coração "Good Things Ahead" | Arquivo STL',
  ...
  'https://ahopngjegljhaalzdnor.supabase.co/storage/v1/object/public/stl-uploads/2BF09941-A25E-43C8-AD88-3758C46A104C.png',
  'https://ahopngjegljhaalzdnor.supabase.co/storage/v1/object/public/stl-uploads/2316B0CF-36D6-49AF-AA3D-5BA2E68219BD.png',
  'https://ahopngjegljhaalzdnor.supabase.co/storage/v1/object/public/stl-uploads/good_things_ahead_heart_keychain.stl',
  now(),
  now()
);
```

---

## **Passo 4: Executar o Script**

### **Opção 1: Botão (Mais Fácil)**
- Clique no botão azul **"Run"** no canto superior direito
- Ou pressione **Ctrl+Enter** (Windows/Linux) / **Cmd+Enter** (Mac)

### **Opção 2: Teclado**
- Pressione **Ctrl+Enter** ou **Cmd+Enter**

---

## **Passo 5: Ver o Resultado**

Se tudo funcionou, você verá:

```
✅ Query executed successfully
```

Na seção **"Result"** (abaixo do script), verá algo como:

```
1 row inserted
```

---

## **✅ Pronto! Produto Inserido!**

Agora acesse: **http://localhost:3000/stl**

Você verá:
- 🎨 **Título:** "Chaveiro Coração 'Good Things Ahead' | Arquivo STL"
- 📸 **Imagem 1:** Preto e Branco (padrão)
- 📸 **Imagem 2:** Rosa (ao passar o mouse)
- 💰 **Preço:** R$ 29,90
- ⬇️ **Botão:** Comprar

---

## **🎯 Próximos Passos**

1. ✅ Clique no produto para ver os detalhes
2. ✅ Passe o mouse na imagem para ver a transição
3. ✅ Teste comprar o arquivo STL
4. ✅ Verifique se o download do arquivo funciona

---

## **⚠️ Se Algo Não Funcionar**

### ❌ "Query executed with errors"
**Solução:** Copie e cole o script novamente, certificando-se de que não há caracteres especiais duplicados

### ❌ Produto não aparece em `/stl`
1. Atualize a página (F5 ou Ctrl+R)
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Aguarde alguns segundos (às vezes a câmera de dados leva um tempo)

### ❌ Imagens não aparecem
1. Verifique se as URLs estão corretas
2. Clique em uma imagem - se aparecer 404, a URL está errada
3. Copie as URLs novamente do Storage

### ❌ Arquivo STL não aparece para download
1. Verifique se o arquivo `good_things_ahead_heart_keychain.stl` existe no Storage
2. Confirme que a URL está correta e completa

---

## **💡 Dica: Verificar os Dados Inseridos**

Se quiser ver se o produto foi realmente inserido, execute esta query:

```sql
SELECT * FROM products WHERE type = 'digital' ORDER BY created_at DESC LIMIT 1;
```

Você verá os dados do seu novo produto!

