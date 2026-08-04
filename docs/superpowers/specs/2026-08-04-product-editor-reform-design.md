# Product Editor Reforma - Design Completo

**Data:** 2026-08-04  
**Escopo:** Refatoração completa da interface de cadastro e edição de produtos  
**Objetivo:** Sistema profissional, modular, sem repetição, com todas as features integradas

---

## Sumário Executivo

Hoje o cadastro de produtos é um monolito (45KB) com lógica dispersa, seções desconexas e experiência fragmentada. Vamos refatorar em uma **micro-aplicação modular** com:

- ✅ Formulário com collapse (abre só o que precisa)
- ✅ Validações robustas em tempo real
- ✅ Rascunho automático (salva a cada 2s no localStorage)
- ✅ Histórico de versões (quem alterou, quando)
- ✅ Permissões granulares (admin vs partner)
- ✅ Variações integradas (sem sair da página)
- ✅ Customizações avançadas (cores, texto, opções)
- ✅ Integração MercadoPago (cálculo de taxas em tempo real)
- ✅ Sem quebrar nada existente

**Resultado:** Uma experiência de edição profissional, escalável e fácil de manter.

---

## 1. Arquitetura Geral

```
ProductEditor/
├── ProductEditorContext (estado global único)
├── hooks/
│   ├── useProductDraft (autosalva + restore)
│   ├── useValidation (validação em tempo real)
│   ├── usePermissions (access control)
│   ├── useProductSync (send to Supabase)
│   ├── useHistory (track versions)
│   ├── useMercadopago (fees calculation)
│   └── useVariationValidation (specific rules)
├── services/
│   ├── validationService (regras de negócio)
│   ├── variationService (lógica de variações)
│   ├── customizationService (seções)
│   ├── mercadopagoService (integração)
│   └── persistenceService (localStorage + Supabase)
├── components/
│   ├── ProductEditor (main page)
│   ├── sections/
│   │   ├── BasicInfoSection
│   │   ├── ImagesSection
│   │   ├── PricingSection
│   │   ├── InventorySection
│   │   ├── VariationsSection ⭐ (novo, integrado)
│   │   ├── CustomizationSection (refatorado)
│   │   ├── MercadoPagoSection (novo)
│   │   └── SEOSection
│   ├── shared/
│   │   ├── CollapsibleSection (wrapper)
│   │   └── ValidationFeedback (erros inline)
│   └── layout/
│       ├── Header (titulo, status, botões)
│       └── Sidebar (progresso, validações resumo)
└── types/
    ├── editor-state.ts
    └── editor-validation.ts
```

### Data Flow

```
User edita campo
  ↓
onChange → atualiza ProductEditorContext
  ↓
useProductDraft detecta mudança → debounce 2s → salva localStorage
  ↓
useValidation valida (async, lazy por field)
  ↓
Context atualiza errors → UI renderiza feedback
  ↓
CollapsibleSection mostra ✅ / ⚠️ / ❌
```

---

## 2. Estado do Contexto

```typescript
type ProductEditorState = {
  // Configuração
  mode: 'create' | 'edit';
  productId?: string;

  // Básico
  name: string;
  description: string;
  category: string;
  tags: string[];
  sku: string;
  active: boolean;

  // Preços
  basePrice: number;
  salePrice: number | null;
  costPrice: number | null;
  isWholesale: boolean;
  minimumOrderQuantity: number;

  // Imagens
  images: string[]; // URLs do Supabase/upload

  // Inventário
  fulfillmentMode: 'made_to_order' | 'ready_stock' | 'hybrid';
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;

  // Variações (NEW)
  variations: Array<{
    id: string; // UUID local ou DB id
    name: string;
    color: string | null; // hex ou paleta
    priceModifier: number;
    stock: number;
    dimensions?: string;
    notes?: string;
    imageUrl?: string;
    _isDirty: boolean;
    _serverError?: string;
  }>;

  // Customizações
  isCustomizable: boolean;
  customizationQuestion: string;
  customizationHelpText: string;
  customizationPlaceholder: string;
  customizationSections: ProductCustomizationSection[];

  // MercadoPago (NEW)
  useMercadopago: boolean;
  mercadopagoFees?: {
    commission: number;
    installmentFee: number;
    withdrawalFee: number;
    finalPrice: number;
    calculatedAt: Date;
  };

  // SEO
  seoTitle: string;
  seoDescription: string;
  slug: string;

  // Metadados do Editor
  errors: Record<string, string>; // { basicInfo: "...", pricing: "...", etc }
  warnings: Record<string, string>; // { pricing: "Margem baixa" }
  isDraft: boolean;
  draftSavedAt: Date | null;
  isSubmitting: boolean;
  submitError: string | null;

  // Permissões
  permissions: {
    canChangeStatus: boolean;
    canEditBasePrice: boolean;
    canEditCustomizations: boolean;
    canSyncMercadopago: boolean;
    canEditBasicInfo: boolean;
    canEditImages: boolean;
    canEditVariations: boolean;
    canEditSEO: boolean;
  };

  // Histórico (NEW)
  versionHistory?: Array<{
    id: string;
    createdAt: Date;
    createdBy: string;
    changes: Record<string, { before: any; after: any }>;
    note?: string;
  }>;
};
```

---

## 3. Seções em Detalhe

### 3.1 BasicInfoSection
- **Nome** (obrigatório, 1-120 chars)
- **Descrição** (max 1000 chars)
- **Categoria** (select)
- **Tags** (multi-select)
- **SKU** (opcional, unique check)
- **Status** (ativo/inativo, only if canChangeStatus)

**Validação:**
- Nome: obrigatório, alfanumérico + espaço
- SKU: único na loja se preenchido

### 3.2 ImagesSection
- Drag & drop upload
- Até 6 imagens
- Reordenação (drag ou botões ↑ ↓)
- Preview em grid
- Botão remover por imagem

**Validação:**
- Min 1, max 6
- Formatos: jpg, png, webp
- Tamanho: 100KB-5MB

**Integração:**
- POST `/api/upload/product-images` → retorna URLs

### 3.3 PricingSection
- **Base Price** (obrigatório, R$ 0.01+)
- **Sale Price** (opcional, deve ser < base)
- **Cost Price** (opcional)
- **Wholesale toggle**
  - Se ON: Minimum Order Qty (2-999)
- **Display real-time:**
  - Margem: (base - cost) / base × 100%
  - Aviso se margem < 20%
  - Faixa de preço com variações

**Validação:**
- Base > 0
- Sale < Base (se preenchido)
- Cost < Base (se preenchido)
- MOQ ∈ [2, 999] (se wholesale)

### 3.4 InventorySection
- **Fulfillment Mode** (radio: Made to Order / Ready Stock / Hybrid)
- **Weight** (grams, optional)
- **Dimensions** (Length, Width, Height em cm, optional)

**Validação:**
- Todos > 0 se preenchidos

### 3.5 VariationsSection ⭐ (NOVO & INTEGRADO)

**Estrutura:**
```
Seção colapsada (título, contador de variações)
  ↓ ao expandir
  ├─ Tab: "Lista" (mostra variações existentes)
  │  └─ Se 0: "Nenhuma variação. Produto terá preço único."
  │  └─ Se > 0: Tabela com:
  │     - Cor (swatch visual)
  │     - Nome/Tamanho
  │     - Preço (+R$ X / -R$ X)
  │     - Estoque
  │     - Ações (edit, delete, ↑ ↓)
  │
  └─ Tab: "Adicionar Nova" (inline form)
     ├─ Nome (opcional se cor)
     ├─ Cor (color picker)
     ├─ Preço adicional (pode ser negativo)
     ├─ Estoque
     ├─ Dimensões (opcional)
     ├─ Notas (opcional)
     ├─ Imagem da variação (opcional)
     └─ Botões: Salvar / Cancelar
```

**State Management:**
- Array `variations[]` no contexto
- Cada ação (add/edit/delete/reorder) atualiza contexto
- Debounce 2s → localStorage
- Nada vai pro BD até submit final

**Validação:**
- Min 1 de (nome OR cor)
- Preço adicional: número válido, pode ser negativo (até -basePrice)
- Estoque: inteiro ≥ 0
- Cor (se preenchida): hex válido

**Diferença do OptionsManager:**
- OptionsManager fica em `/dashboard/products/[id]` (página dedicada, admin avançado)
- VariationsSection fica inline no form (workflow principal)
- OptionsManager: salva direto no BD
- VariationsSection: salva no contexto + localStorage até submit

### 3.6 CustomizationSection (REFATORADO)

**Toggle:** "É customizável?"

Se SIM:
- Pergunta (text, max 120 chars)
- Texto de ajuda (textarea, max 300)
- Placeholder (text, max 180)

**Seções de customização (list):**
Cada seção:
```
┌─ Tipo (radio): Cor | Texto | Cor+Texto | Opção | Opção+Texto
├─ Label (ex: "Escolha a cor")
├─ Obrigatória? (toggle)
├─ Help text (textarea)
├─ Placeholder (text)
├─ [If Cor/Cor+Texto]
│  └─ Cores (picker + paleta)
│  └─ Auto-seleção por tamanho? (toggle)
├─ [If Opção/Opção+Texto]
│  └─ Opções (list com nome + imagem opcional)
│  └─ Botão "Adicionar opção"
└─ Ações: ↑ ↓ Deletar
```

**Validação:**
- Se customizable: pergunta + ajuda obrigatórios
- Labels únicos por seção
- Max 10 seções
- Cores: hex válido

### 3.7 MercadoPagoSection (NOVO)

**Toggle:** "Vender via MercadoPago?"

Se SIM:
```
📊 Info box:
  Taxa de comissão: X%
  Taxa de instalação: Y%
  Taxa de saque: Z%
  ⬇️
  Preço final será: R$ X,XX

🔗 Status webhook: 🟢 Conectado / 🔴 Erro
   Botão: "Testar webhook"
   Botão: "Ver histórico de taxas"

⚠️ Nota: "Mudanças de preço não afetam vendas ativas"
```

**Validação:**
- Se ativo: webhook registrado
- Preço final > 0

**Integração:**
- Fetch `/api/mercadopago/calculate-fees` ao ativar ou mudar preço
- Webhook: `/api/webhooks/mercadopago`

### 3.8 SEOSection

- Meta Title (max 60)
- Meta Description (max 160)
- Slug (auto-gerado, editável)
- Recomendações visuais (verde/amarelo/vermelho)
- Botão: "Pré-visualizar SERP"

**Validação:**
- Slug: URL-safe, unique
- Title: 30-60 chars recomendado
- Description: 120-160 chars recomendado

---

## 4. Fluxos de Usuário

### 4.1 Criar Novo Produto

```
1. User acessa /dashboard/products/new
2. ProductEditor carrega modo="create"
   └─ Contexto inicializado com defaults
   └─ Rascunho restaurado do localStorage (se existe)
3. User expande BasicInfoSection
   └─ Preenche nome, categoria, etc
   └─ onChange atualiza contexto
   └─ Debounce 2s → salva localStorage
4. User vai para ImagesSection
   └─ Faz upload de imagens
   └─ Vai para PricingSection
5. User abre VariationsSection
   └─ Clica "Adicionar variação"
   └─ Preenche: cor, nome, preço, estoque
   └─ Clica "Salvar"
   └─ Variação aparece na lista
6. Repete para + variações (opcional)
7. User abre CustomizationSection
   └─ Toggle "customizável" ON
   └─ Preenche pergunta + ajuda
   └─ Adiciona seções (cores, opções, etc)
8. User abre MercadoPagoSection
   └─ Toggle ON
   └─ Sistema busca fees → mostra preço final
9. User abre SEOSection
   └─ Preenche titulo, description, slug
10. User clica "SALVAR PRODUTO"
    └─ Validação final (todas as seções)
    └─ Se erro → scroll + toast
    └─ Se OK → POST /api/admin/products
    └─ Recebe productId
    └─ useHistory registra versão inicial
    └─ Redirect para /dashboard/products/{id}
    └─ Toast: "Produto criado com sucesso"
```

### 4.2 Editar Produto Existente

```
1. User acessa /dashboard/products/{id}/edit
2. ProductEditor carrega modo="edit"
   └─ Fetch dados do produto + variações + customizações
   └─ Preenche contexto
   └─ Rascunho restaurado (se existe) com prompt "Restaurar mudanças?"
3. User faz alterações (mesmo fluxo que criar)
4. User clica "SALVAR PRODUTO"
   └─ Validação final
   └─ Se OK → PATCH /api/admin/products/{id}
   └─ useHistory compara: antes vs depois → registra apenas mudanças
   └─ localStorage: limpa rascunho
   └─ Toast: "Produto atualizado com sucesso"
   └─ Refresh (ou redireciona)
```

### 4.3 Rascunho Automático

```
User faz primeira mudança
  ↓
onChange atualiza contexto
  ↓
useProductDraft detecta isDraft=true
  ↓
Debounce 2s
  ↓
localStorage: salva estado completo em key "product_editor_draft_{mode}_{productId?}"
  ↓
UI exibe badge "Rascunho salvo há 0s"
  ↓
Se page recarrega → restaura automaticamente
  ↓
User vê toast: "Rascunho restaurado"
  ↓
Botão "Descartar rascunho" limpa localStorage + recarrega dados originais
```

### 4.4 Validação em Tempo Real

```
User sai de um campo (blur) ou clica submit
  ↓
useValidation roda validação daquele setor
  ↓
Encontra erro? → context.errors[sectionName] = mensagem
  ↓
Encontra aviso? → context.warnings[sectionName] = mensagem
  ↓
CollapsibleSection atualiza badge:
  - ✅ Se válido
  - ⚠️ Se aviso
  - ❌ Se erro
  ↓
Ao submeter: validação final (todas seções)
  └─ Se erro → scroll para primeira seção com erro
  └─ Toast: "Revise os campos com erro"
```

---

## 5. Validações & Regras de Negócio

### 5.1 BasicInfo
- Nome: obrigatório, 1-120 chars, sem chars perigosos
- SKU: opcional, unique (não pode repetir no mesmo shop)

### 5.2 Pricing
- Base price: > 0
- Sale price: > 0 E < base (se preenchido)
- Cost price: > 0 E < base (se preenchido)
- Margem mínima: ≥ 20% (aviso se < 20%)
- MOQ: inteiro, 2-999 (se wholesale)

### 5.3 Variations
- Array pode estar vazio OU ter variações (ambos OK)
- Se tiver variações:
  - Cada uma: nome OU cor (min 1)
  - Price modifier: número válido, pode ser negativo (até -basePrice)
  - Stock: inteiro ≥ 0
  - Cor (se preenchida): hex válido (#RRGGBB ou #RRGGBBAA)

### 5.4 Customization
- Se isCustomizable=true:
  - customizationQuestion: obrigatória, 1-120 chars
  - customizationHelpText: obrigatória, 1-300 chars
  - customizationPlaceholder: obrigatória, 1-180 chars
- Se tiver seções:
  - Cada seção: tipo + label obrigatórios
  - Labels únicos
  - Max 10 seções
  - Se tipo=color: cores obrigatórias, hex válido
  - Se tipo=option: opções obrigatórias

### 5.5 MercadoPago
- Se useMercadopago=true:
  - Webhook deve estar registrado
  - finalPrice > 0

### 5.6 SEO
- Slug: URL-safe, unique no shop
- Title: 30-60 chars recomendado
- Description: 120-160 chars recomendado

---

## 6. Permissões & Access Control

```typescript
const permissions = {
  // Admin: tudo
  canChangeStatus: user.accessLevel === 'admin',
  canEditBasePrice: user.accessLevel !== 'partner',
  canEditCustomizations: user.accessLevel !== 'partner',
  canSyncMercadopago: user.accessLevel === 'admin',

  // Todos (se não partner):
  canEditBasicInfo: true,
  canEditImages: true,
  canEditVariations: true,
  canEditSEO: true,
};
```

**Comportamento:**
- Campo sem permissão: readonly, style cinza, tooltip "Apenas admins podem editar"
- Ao submeter: validação de permissão no backend (nunca confiar só no frontend)

---

## 7. Integração Backward Compatible

### Não quebra:
- ✅ `/dashboard/products/[id]` → OptionsManager continua como é
- ✅ `/api/product-options` → funciona igual
- ✅ `/api/products` → payload compatível
- ✅ STLProductForm → não muda

### O que muda:
- `ProductForm` → refatorado em `ProductEditor` (props API compatível)
- localStorage: novo esquema, antigo descartado sem erro

---

## 8. Testes

### Unit Tests (Vitest)
- validationService: SKU unique, pricing rules, variation conflicts
- useProductDraft: localStorage save/restore, debounce
- useValidation: field-level validations

### Component Tests (Vitest + RTL)
- VariationsSection: add, edit, delete, reorder, validations
- CustomizationSection: toggle, add sections, validate colors
- CollapsibleSection: collapse/expand, error display

### E2E Tests (Playwright)
- Create full product workflow (básico → imagens → preços → variações → submit)
- Edit product + variations + customizations
- Validação em submit
- Rascunho auto-restore

---

## 9. Performance

- Debounce: 2s em onChange → localStorage
- Lazy rendering: Seções colapsadas não renderizam até expandir (React.lazy + Suspense)
- Memoization: Cada section é React.memo
- Validação lazy: Só valida ao blur ou submit
- Image optimization: Thumbnail preview até upload
- Virtualization: Se > 50 variações, virtualize lista

---

## 10. Estrutura de Arquivos Final

```
components/admin/ProductEditor/
├── ProductEditor.tsx (main page component)
├── ProductEditorContext.tsx (provider)
├── ProductEditorHeader.tsx (titulo, status, botões)
├── ProductEditorSidebar.tsx (progresso, validações)
│
├── sections/
│   ├── BasicInfoSection.tsx
│   ├── ImagesSection.tsx
│   ├── PricingSection.tsx
│   ├── InventorySection.tsx
│   ├── VariationsSection.tsx ⭐
│   ├── CustomizationSection.tsx
│   ├── MercadoPagoSection.tsx
│   └── SEOSection.tsx
│
├── shared/
│   ├── CollapsibleSection.tsx
│   ├── ValidationFeedback.tsx
│   └── ErrorBoundary.tsx
│
├── hooks/
│   ├── useProductDraft.ts
│   ├── useProductEditor.ts (context consumer)
│   ├── useValidation.ts
│   ├── usePermissions.ts
│   ├── useProductSync.ts
│   ├── useHistory.ts
│   ├── useMercadopago.ts
│   └── useVariationValidation.ts
│
├── services/
│   ├── validationService.ts
│   ├── variationService.ts
│   ├── customizationService.ts
│   ├── mercadopagoService.ts
│   └── persistenceService.ts
│
├── types/
│   ├── editor-state.ts
│   ├── editor-validation.ts
│   └── index.ts
│
└── __tests__/
    ├── validationService.test.ts
    ├── useProductDraft.test.ts
    ├── VariationsSection.test.tsx
    ├── CustomizationSection.test.tsx
    └── ProductEditor.e2e.ts (Playwright)
```

---

## 11. Migration Path

1. **Semana 1:** Criar estructura base (context, hooks, types, shared components)
2. **Semana 2:** Implementar seções básicas (BasicInfo, Pricing, Images, Inventory)
3. **Semana 3:** VariationsSection + CustomizationSection
4. **Semana 4:** MercadoPagoSection, SEOSection, Testes
5. **Semana 5:** QA, fixes, deploy

---

## Conclusão

Esta refatoração transforma o cadastro de produtos em um editor profissional, modular e escalável. Sem quebrar nada existente. Pronto pra crescer.

**Next:** Implementation plan com tasks granulares.
