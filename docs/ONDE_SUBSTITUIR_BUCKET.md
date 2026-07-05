# 🪣 Onde Substituir o Nome do Bucket (Ultra Simples)

## **O Problema**

No script SQL, há textos como:
```
https://sua-bucket.supabase.co/...
```

Você precisa substituir `sua-bucket` pelo **nome real do seu projeto** no Supabase.

---

## **Como Descobrir o Seu Bucket/Projeto**

### **Opção 1: Pelo Supabase Dashboard**

1. Abra https://app.supabase.com
2. Clique no seu projeto
3. Na barra do topo, procure pela URL:
   ```
   https://app.supabase.com/project/xyzabc123/editor/sql
   ```
4. A parte `xyzabc123` é seu **ID do projeto**

### **Opção 2: Olhar uma URL Pública que você já copiou**

Se você já fez upload de um arquivo e copiou a URL, ela mostra:
```
https://xyzabc123.supabase.co/storage/v1/object/public/stl-products/...
```

A parte `xyzabc123` é seu **ID do projeto**

---

## **Como Substituir no Script**

### **ANTES:**
```sql
image_url: 'https://sua-bucket.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-black-white.jpg',
image_url_2: 'https://sua-bucket.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-pink.jpg',
file_path: 'stl/coracao-goodthings.stl',
```

### **DEPOIS (exemplo com projeto "abc123def456"):**
```sql
image_url: 'https://abc123def456.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-black-white.jpg',
image_url_2: 'https://abc123def456.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-pink.jpg',
file_path: 'https://abc123def456.supabase.co/storage/v1/object/public/stl-products/coracao-goodthings.stl',
```

---

## **Visual: Onde Está a Mudança**

```
https://sua-bucket.supabase.co/storage/...
          ^^^^^^^^^^
       SUBSTITUA AQUI POR SEU ID DO PROJETO
       
Exemplo: https://xyzabc123.supabase.co/storage/...
```

---

## **✅ Checklist**

- [ ] Descobri meu ID do projeto Supabase
- [ ] Substitui `sua-bucket` por meu ID em **todas as 3 URLs**
- [ ] Copiei as URLs públicas do Storage
- [ ] Substitui as 3 URLs no script SQL
- [ ] O script está pronto para executar

---

## **Dica: Use Find & Replace**

Se você tem dúvida, use **Find & Replace**:

1. Abra `scripts/insert-stl-product.sql` no seu editor
2. Pressione **Ctrl+H** (Windows/Linux) ou **Cmd+H** (Mac)
3. **Find:** `sua-bucket`
4. **Replace with:** `xyzabc123` (seu ID real)
5. Clique **Replace All**
6. Pronto! Todas as URLs serão atualizadas

---

## **⚠️ Importante**

- ✅ NÃO mude o nome do bucket (`stl-products`)
- ✅ NÃO mude os nomes dos arquivos
- ✅ SÓ mude a parte `sua-bucket` → `seu-id-real`

