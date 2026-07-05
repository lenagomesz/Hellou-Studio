# 📸 Guia Completo: Upload de Imagens e Arquivo STL no Supabase

## **Visão Geral**

Você precisa:
1. ✅ Upload das **2 imagens** (619x619)
2. ✅ Upload do **arquivo STL** (.stl)
3. ✅ Obter as **URLs públicas** de cada arquivo
4. ✅ Substituir as URLs no script SQL

---

## **Passo 1: Acessar o Supabase Storage**

1. Abra seu **Supabase Dashboard**: https://app.supabase.com
2. Selecione seu projeto
3. No menu lateral esquerdo, clique em **Storage** (ícone de pasta)

---

## **Passo 2: Criar ou Acessar o Bucket**

### **Se o bucket `stl-products` NÃO existe:**

1. Clique em **"New Bucket"** (botão azul no topo)
2. Preencha:
   - **Name**: `stl-products`
   - **Make it public**: ✅ SIM (marcar a caixa)
3. Clique **"Create Bucket"**

### **Se o bucket já existe:**

1. Clique em **`stl-products`** na lista

---

## **Passo 3: Fazer Upload das Imagens**

### **Imagem 1 (Preto e Branco)**

1. Dentro do bucket `stl-products`, clique **"Upload file"**
2. Selecione: `619x619-coracao-goodthings-black-white.jpg`
3. Aguarde a barra de progresso completar (até 100%)
4. A imagem aparecerá na lista

### **Imagem 2 (Colorida - Rosa)**

1. Clique **"Upload file"** novamente
2. Selecione: `619x619-coracao-goodthings-pink.jpg`
3. Aguarde completar
4. A imagem aparecerá na lista

**Resultado esperado:**
```
📁 stl-products/
  ├── 619x619-coracao-goodthings-black-white.jpg
  └── 619x619-coracao-goodthings-pink.jpg
```

---

## **Passo 4: Fazer Upload do Arquivo STL**

1. Clique **"Upload file"** novamente
2. Selecione: `coracao-goodthings.stl`
3. Aguarde completar
4. O arquivo aparecerá na lista

**Resultado esperado:**
```
📁 stl-products/
  ├── 619x619-coracao-goodthings-black-white.jpg
  ├── 619x619-coracao-goodthings-pink.jpg
  └── coracao-goodthings.stl
```

---

## **Passo 5: Obter as URLs Públicas**

Para **cada arquivo**, faça o seguinte:

### **Imagem 1 - Preto e Branco:**

1. Na lista, clique em `619x619-coracao-goodthings-black-white.jpg`
2. Procure pelo botão **"Copy public URL"** ou **ícone de clipboard**
3. A URL será copiada para sua área de transferência
4. **Cole em um editor de texto** para referência

**A URL virá assim:**
```
https://seu-projeto-uuid.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-black-white.jpg
```

### **Imagem 2 - Rosa:**

1. Clique em `619x619-coracao-goodthings-pink.jpg`
2. Clique **"Copy public URL"**
3. **Cole em um editor de texto**

**A URL virá assim:**
```
https://seu-projeto-uuid.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-pink.jpg
```

### **Arquivo STL:**

1. Clique em `coracao-goodthings.stl`
2. Clique **"Copy public URL"**
3. **Cole em um editor de texto**

**A URL virá assim:**
```
https://seu-projeto-uuid.supabase.co/storage/v1/object/public/stl-products/coracao-goodthings.stl
```

---

## **Passo 6: Substituir no Script SQL**

Abra o arquivo: `scripts/insert-stl-product.sql`

**ANTES:**
```sql
image_url: 'https://sua-bucket.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-black-white.jpg',
image_url_2: 'https://sua-bucket.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-pink.jpg',
file_path: 'stl/coracao-goodthings.stl',
```

**DEPOIS (com suas URLs reais):**
```sql
image_url: 'https://xyzabc123.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-black-white.jpg',
image_url_2: 'https://xyzabc123.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-pink.jpg',
file_path: 'https://xyzabc123.supabase.co/storage/v1/object/public/stl-products/coracao-goodthings.stl',
```

**Dica:** Substitua apenas a parte `sua-bucket` pela parte real `xyzabc123`

---

## **Passo 7: Executar o Script SQL**

1. No Supabase Dashboard, vá para **SQL Editor** (menu lateral)
2. Clique **"New Query"**
3. **Cole o script completo** (com as URLs já corrigidas)
4. Clique **"Run"** (ou pressione Ctrl+Enter)
5. Você verá a mensagem: **"Query executed successfully"**

---

## **✅ Pronto! O Produto Está Inserido**

Agora acesse:
```
http://localhost:3000/stl
```

E você verá o produto:
- **Nome:** Chaveiro Coração "Good Things Ahead" | Arquivo STL
- **Imagem 1:** Preto e Branco (padrão)
- **Imagem 2:** Rosa (ao passar mouse)
- **Preço:** R$ 29,90

---

## **🎯 Resumo das 3 URLs que você precisa**

| O quê | Onde está | Como usar |
|-------|-----------|-----------|
| **Imagem 1 (Preto/Branco)** | `image_url` | URL pública da imagem 1 |
| **Imagem 2 (Rosa)** | `image_url_2` | URL pública da imagem 2 |
| **Arquivo STL** | `file_path` | URL pública do arquivo .stl |

---

## **⚠️ Erros Comuns**

### ❌ Erro: "Arquivo não encontrado" ou imagens em branco
**Causa:** O bucket não está como **Public**
**Solução:** 
1. Va em Storage → `stl-products`
2. Clique no ⚙️ (settings)
3. Marque **"Make public"**

### ❌ Erro: "Storage access denied"
**Causa:** URLs estão erradas ou arquivo foi deletado
**Solução:**
1. Verifique se os arquivos ainda existem no Storage
2. Copie novamente as URLs públicas
3. Execute o script SQL novamente

### ❌ Imagens não transicionam
**Causa:** `image_url_2` está vazio ou errado
**Solução:**
1. Verifique que você preencheu `image_url_2` corretamente
2. Confirme que a imagem 2 existe no Storage

---

## **📱 Próximos Passos**

Depois que o produto está inserido:
1. ✅ Acesse `/stl` e veja o produto aparecer
2. ✅ Passe o mouse na imagem para ver a transição
3. ✅ Clique no produto para ver detalhes
4. ✅ Teste o download do arquivo STL

