# Deploy para Produção — Checklist

## Pré-requisitos

- [ ] Criar conta na Vercel (https://vercel.com) se ainda não tem
- [ ] Instalar Vercel CLI: `npm i -g vercel`

## Passo a passo

### 1. Commitar o código

O Vercel precisa de um commit. Faça:

```bash
git add .
git commit -m "feat: ecommerce 3d completo"
git push origin main
```

Ou se quiser deploy local sem push:

```bash
vercel login
vercel --prod
```

### 2. Conectar projeto na Vercel

- Vá em https://vercel.com/new
- Importe o repositório do GitHub
- Framework Preset: Next.js (auto-detectado)

### 3. Variáveis de ambiente (OBRIGATÓRIO)

Copie TODAS as variáveis do `.env.local` para Settings → Environment Variables na Vercel.
As principais:

| Variável | Valor em produção |
|----------|-------------------|
| `NEXTAUTH_URL` | `https://seudominio.com` (trocar de localhost!) |
| `NEXTAUTH_SECRET` | Manter o mesmo ou gerar novo com `openssl rand -base64 32` |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (admin) |
| `STRIPE_SECRET_KEY` | Trocar para `sk_live_...` quando for venda real |
| `STRIPE_PUBLISHABLE_KEY` | Trocar para `pk_live_...` quando for venda real |
| `STRIPE_WEBHOOK_SECRET` | Criar webhook novo de produção (ver abaixo) |
| `NEXT_PUBLIC_SUPABASE_URL` | Mesmo que SUPABASE_URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Mesmo que SUPABASE_ANON_KEY |

### 4. Configurar domínio

- Vercel → Settings → Domains → Adicionar domínio
- Configurar DNS no provedor (Registro.br, Cloudflare, etc.):
  - CNAME `@` ou `www` → `cname.vercel-dns.com`
  - Ou A record → IP que a Vercel fornecer
- HTTPS é automático na Vercel

### 5. Supabase — URLs permitidas

- Supabase Dashboard → Authentication → URL Configuration
- **Site URL**: `https://seudominio.com`
- **Redirect URLs**: adicionar `https://seudominio.com/**`
- Se usar Google/GitHub OAuth: atualizar os callback URLs nos provedores também

### 6. Stripe — Webhook de produção

- Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://seudominio.com/api/webhook`
- Eventos para ouvir: `checkout.session.completed`, `payment_intent.succeeded`
- Copiar o signing secret (`whsec_...`) para a variável `STRIPE_WEBHOOK_SECRET` na Vercel

### 7. Stripe — Modo ao vivo

Quando quiser receber pagamentos reais:
- Stripe Dashboard → sair do Test Mode (toggle no canto superior)
- Copiar as novas chaves `sk_live_` e `pk_live_`
- Atualizar na Vercel

### 8. Banco de dados

- Se o Supabase já é o de produção: ok, nada a fazer
- Se precisa migrar: rodar `supabase db push` ou aplicar as migrations manualmente
- Rodar seed do admin se necessário: ajustar o script para apontar para prod

### 9. Limpar scripts de dev

O script `"dev"` tem `NODE_TLS_REJECT_UNAUTHORIZED=0` — isso é só para dev local, não afeta produção na Vercel (ela usa o script `build`).

---

## Depois do deploy

- [ ] Testar login/cadastro
- [ ] Testar adicionar produto ao carrinho e finalizar compra (com cartão de teste se ainda em test mode)
- [ ] Verificar se imagens dos produtos carregam
- [ ] Testar painel admin (`/dashboard`)
- [ ] Verificar se notificações/emails funcionam
- [ ] Testar formulário de encomenda (upload .stl)

---

## Resumo rápido (TL;DR)

1. `git push`
2. Importar na Vercel
3. Colar variáveis de ambiente (lembrar de trocar NEXTAUTH_URL pro domínio!)
4. Adicionar domínio
5. Atualizar Site URL no Supabase
6. Criar webhook do Stripe apontando pro domínio
7. Deploy automático!
