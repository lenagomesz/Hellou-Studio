# Segurança do Projeto

## Status de Segurança

✅ **Implementado:**
- HTTPS apenas (HSTS headers)
- Content Security Policy (CSP)
- X-Frame-Options: DENY (proteção contra clickjacking)
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Permissions-Policy (camera, microphone, geolocation, usb bloqueados)
- No-cache em endpoints de API
- Validação de entrada em rotas
- NextAuth.js com sessions seguras

## Recomendações de Segurança

### 1. **Variáveis de Ambiente**
✅ Use apenas `NEXT_PUBLIC_` para dados públicos
✅ Credenciais Supabase, Stripe, etc. devem estar em `.env.local` (não versionado)

### 2. **Chamadas de API**
✅ Operações sensíveis (criar, deletar, atualizar) devem usar:
  - Server Actions (React 'use server')
  - API routes protegidas com autenticação
  
❌ Evitar chamadas fetch diretas do client para dados sensíveis

### 3. **Autenticação**
✅ NextAuth.js implementado
✅ Sessions seguras com HttpOnly cookies
✅ Admin roles verificados no servidor

### 4. **Banco de Dados**
✅ Supabase RLS (Row Level Security) habilitado
✅ Usuários só podem ver/modificar seus próprios dados
✅ Admin tem acesso controlado via policies

### 5. **Rate Limiting**
⚠️ **Não implementado** - Recomendado para produção:

Adicionar em `lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1h'),
  analytics: true,
  prefix: 'ratelimit:login',
});

export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1h'),
  analytics: true,
  prefix: 'ratelimit:api',
});
```

Endpoints críticos para rate limiting:
- POST `/api/auth/signin` - Login (5/hora)
- POST `/api/checkout/sessions` - Pedido (10/hora)
- POST `/api/orders/ratings` - Avaliações (20/hora)
- POST `/api/admin/*` - Admin (50/hora)

### 6. **CORS**
✅ Apenas same-origin (implícito em Next.js)

### 7. **XSS Protection**
✅ React sanitiza por padrão
✅ CSP header implementado
⚠️ Se renderizar HTML dinâmico, usar `dompurify`:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### 8. **SQL Injection**
✅ Supabase client usa prepared statements (parametrizadas)

### 9. **CSRF Protection**
✅ Implementado em NextAuth.js (cookies SameSite)

### 10. **Sensitive Data**
❌ **Nunca** commitar:
- `.env.local` ✓ Já em .gitignore
- `.env*.local`
- Keys, tokens, credentials

✅ Usar `.env.example` para documentar variáveis necessárias

## Headers de Segurança Configurados

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=()
Content-Security-Policy: [veja next.config.ts para detalhes]
Cache-Control: no-store, must-revalidate (APIs)
```

## Checklist para Produção

- [ ] Revisar todas as variáveis de ambiente (.env.local)
- [ ] Habilitar HTTPS obrigatório (já configurado)
- [ ] Implementar rate limiting (Upstash Redis recomendado)
- [ ] Adicionar logging de auditoria para operações críticas
- [ ] Revisar RLS policies no Supabase
- [ ] Testar autenticação em prod
- [ ] Configurar backup automático do banco
- [ ] Habilitar 2FA no Supabase/Vercel
- [ ] Revisar credenciais de terceiros (Stripe, MercadoPago)
- [ ] Implementar WAF (Web Application Firewall) se necessário

## Como Proteger Dados na Network

**Problema:** Credenciais/tokens visíveis na aba Network do navegador

**Solução:** Usar Server Actions e API routes protegidas

**Exemplo - Antes (perigoso):**
```typescript
// ❌ NO CLIENT
const res = await fetch('/api/admin/users', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Exemplo - Depois (seguro):**
```typescript
// ✅ NO SERVER
'use server'
async function getUsers() {
  const session = await getSession();
  if (!session?.user?.isAdmin) throw new Error('Unauthorized');
  
  const admin = getSupabaseAdmin();
  return admin.from('users').select('*');
}
```

## Ferramentas de Auditoria

```bash
# Verificar vulnerabilidades em dependências
npm audit

# Verificar secrets em git
npm install -g git-secrets
git secrets --install
git secrets --add 'NEXT_PUBLIC_' # Whitelist

# Escanear código
npm install -D sonarqube-scanner
```

## Logs e Monitoramento

Implementar logging em operações críticas:
```typescript
console.error('[admin] User deleted', { userId, by: session.user.id, timestamp });
console.warn('[security] Failed login attempt', { email, ip, timestamp });
```

---
**Última atualização:** 2026-07-11
**Versão:** 1.0
