# 📋 Como Adicionar um Produto STL no Supabase

## ✅ Guia Completo: Chaveiro Coração "Good Things Ahead"

### **Passo 1: Preparar as Imagens**

As imagens que você tem:
- `619x619-coracao-goodthings-black-white.jpg` (Preto e Branco)
- `619x619-coracao-goodthings-pink.jpg` (Colorida - Rosa)

---

### **Passo 2: Upload no Supabase Storage**

1. Acesse seu **Supabase Dashboard**
2. Vá para **Storage** (no menu lateral esquerdo)
3. Crie um novo bucket chamado `stl-products` (se não existir):
   - Clique em **"New Bucket"**
   - Nome: `stl-products`
   - Deixe como **Public**
   - Clique **"Create bucket"**

4. Abra o bucket `stl-products`
5. Faça upload das **2 imagens**:
   - Clique **"Upload file"**
   - Selecione `619x619-coracao-goodthings-black-white.jpg`
   - Aguarde o upload completar
   - Repita para `619x619-coracao-goodthings-pink.jpg`

6. Faça upload do **arquivo STL**:
   - Clique **"Upload file"**
   - Selecione `coracao-goodthings.stl`

---

### **Passo 3: Obter as URLs Públicas**

Para cada arquivo uploadado:

1. Clique no arquivo no Storage
2. Procure pelo botão **"Copy public URL"** (ícone de clipboard)
3. A URL virá algo como:
   ```
   https://seu-projeto.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-black-white.jpg
   https://seu-projeto.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-pink.jpg
   https://seu-projeto.supabase.co/storage/v1/object/public/stl-products/coracao-goodthings.stl
   ```

---

### **Passo 4: Executar o Script SQL**

1. Abra o arquivo em:
   ```
   scripts/insert-stl-product.sql
   ```

2. Substitua as URLs:
   ```sql
   image_url: 'COLE_A_URL_DA_IMAGEM_1_AQUI',
   image_url_2: 'COLE_A_URL_DA_IMAGEM_2_AQUI',
   file_path: 'COLE_A_URL_DO_ARQUIVO_STL_AQUI',
   ```

3. No Supabase Dashboard:
   - Vá para **SQL Editor** (no menu lateral)
   - Clique **"New Query"**
   - Cole o script modificado
   - Clique **"Run"** (ou Ctrl+Enter)

4. Pronto! ✅ O produto aparecerá em **http://localhost:3000/stl**

---

## 📊 Dados do Produto

| Campo | Valor |
|-------|-------|
| **Nome** | Chaveiro Coração "Good Things Ahead" \| Arquivo STL |
| **Preço** | R$ 29,90 |
| **Tipo** | digital |
| **Categoria** | chaveiros |
| **Descrição** | [Veja no script SQL] |
| **Imagem 1** | Preto e Branco (619x619) |
| **Imagem 2** | Colorida - Rosa (619x619) |
| **Arquivo STL** | coracao-goodthings.stl |

---

## 🔄 O que Acontece Depois

✅ O produto aparecerá na página **STL (/stl)**
✅ Ao passar o mouse, as imagens transicionam (preto/branco → rosa)
✅ Mostra indicador "1/2" e "2/2"
✅ Cliente pode comprar e fazer download imediato do arquivo

---

## ⚠️ Dicas Importantes

- **Nomes das imagens**: Use `619x619-` no início para manter consistência
- **Arquivo STL**: Certifique-se de que o arquivo está bem comprimido e otimizado
- **Descrição**: Use quebras de linha (`\n`) para melhor formatação
- **Preço**: Sempre em BRL (Real Brasileiro)

---

## 🐛 Se Algo Não Funcionar

1. **Imagens não aparecem**: Verifique se as URLs estão corretas e o bucket é **Public**
2. **Arquivo STL não baixa**: Verifique o caminho do `file_path`
3. **Produto não aparece**: Verifique se `type = 'digital'` (exatamente assim)
4. **Erro SQL**: Confirme que a tabela `products` existe e tem as colunas corretas

