# Setup 2FA e Sentry

## 1. 2FA (Two-Factor Authentication)

### Dependências já instaladas:
```bash
speakeasy  # TOTP generator
qrcode     # QR code generation
```

### Implementação:

**Arquivo de lógica:** `lib/2fa.ts`
- `generate2FA(email)` - Gera secret e QR code
- `verify2FA(secret, token)` - Verifica código TOTP
- `generateBackupCodes()` - Gera 10 backup codes
- `verifyBackupCode()` - Verifica backup code

**Endpoints de API:**
- `POST /api/admin/2fa/setup` - Inicia setup (retorna QR code)
- `POST /api/admin/2fa/confirm` - Confirma 2FA (ativa no banco)

**Banco de dados:**
Executar migração em `supabase/migrations/add_2fa_to_users.sql`:
```sql
ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN;
ALTER TABLE users ADD COLUMN two_fa_secret TEXT;
ALTER TABLE users ADD COLUMN two_fa_backup_codes TEXT[];
```

### Como usar:

1. Admin vai em dashboard > Security > Enable 2FA
2. Escaneia QR code com Google Authenticator/Authy
3. Coloca código de 6 dígitos para confirmar
4. Recebe 10 backup codes para guardar em lugar seguro
5. Próximo login será pedido código TOTP

### Próximas etapas (não implementadas):
- Modificar NextAuth callback para pedir 2FA se habilitado
- Criar página de setup 2FA no dashboard
- Adicionar página de "Verify 2FA" no login

---

## 2. Sentry (Error Tracking & Security Logging)

### Dependências já instaladas:
```bash
@sentry/nextjs  # Sentry SDK para Next.js
```

### Implementação:

**Configs:**
- `sentry.server.config.ts` - Configuração server-side
- `sentry.client.config.ts` - Configuração client-side

**O que rastreia:**
- Erros em tempo real
- Performance (requisições lentas)
- Logs de segurança (tentativas de login falhas, etc)
- Stack traces completos para debugging

### Setup (5 minutos):

1. **Criar conta Sentry:**
   ```
   https://sentry.io
   Criar conta gratuita
   Criar novo projeto > Next.js
   ```

2. **Copiar DSN:**
   ```
   Auth Token: https://sentry.io/settings/account/api/auth-tokens/
   Project DSN: https://sentry.io/settings/[org]/projects/[project]/keys/
   ```

3. **Adicionar .env.local:**
   ```
   SENTRY_DSN=https://...@sentry.io/... (do projeto)
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/... (mesmo)
   SENTRY_AUTH_TOKEN=sntrys_... (do auth tokens)
   ```

4. **Build & Deploy:**
   ```bash
   npm run build
   npm run dev
   ```
   Sentry começará a registrar erros automaticamente.

### O que você verá no Sentry Dashboard:

- **Issues:** Lista de erros únicos
- **Release Health:** % de requests sem erro
- **Performance:** Transações lentas
- **Breadcrumbs:** Stack trace detalhado
- **Security Alerts:** Tentativas suspeitas

### Exemplo de erro capturado:
```
❌ POST /api/orders/ratings - 500 Error
   User: user@example.com
   Error: "Cannot read property 'order_id' of undefined"
   File: app/api/orders/ratings/route.ts:45
   Time: 2026-07-11 14:23:45
```

### Filtragem de Ruído:
Configs já fazem:
- ✓ Ignora erros 404 (não importantes)
- ✓ Ignora timeouts (problema do usuário)
- ✓ Ignora extensões do navegador
- ✓ Ignora scripts de terceiros

---

## 3. Rate Limiting com Upstash Redis (Optional)

Já existe implementação simples em `proxy.ts`, mas para produção recomenda-se persistente.

### Setup (30 minutos):

1. **Criar conta:**
   ```
   https://console.upstash.com
   Redis > Create > Select region (sa-east-1 Brasil)
   ```

2. **Copiar credenciais:**
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

3. **Descomentar em `lib/rate-limit-example.ts`**
   Código já está pronto, só precisa descomentar.

4. **Usar em endpoints críticos:**
   ```typescript
   import { loginLimiter } from '@/lib/rate-limit';

   export async function POST(req: NextRequest) {
     const ip = req.ip || 'anonymous';
     const { success } = await loginLimiter.limit(ip);
     
     if (!success) {
       return new NextResponse('Too many requests', { status: 429 });
     }
     
     // Continuar...
   }
   ```

---

## 4. GitHub Dependabot (Automático)

Não precisa de setup adicional. GitHub verá `package.json` e:
- ✓ Escaneia vulnerabilidades diariamente
- ✓ Cria PRs automáticas com updates
- ✓ Roda testes automaticamente
- ✓ Você aprova e merge

Ativar em:
```
Repo > Settings > Code security > Dependabot > Enable all
```

---

## 5. Checklist de Implementação

### HOJE (crítico):
- [ ] Executar `npm audit fix --force` (se houver vulns altas)
- [ ] Criar conta Sentry
- [ ] Adicionar SENTRY_DSN e SENTRY_AUTH_TOKEN em .env.local
- [ ] Testar 2FA endpoints (`POST /api/admin/2fa/setup`)
- [ ] Executar migração de 2FA no Supabase

### ESTA SEMANA (importante):
- [ ] Criar página de setup 2FA no dashboard
- [ ] Integrar 2FA check no login (NextAuth callback)
- [ ] Setup Upstash Redis (opcional mas recomendado)
- [ ] Testar Sentry dashboard com erro artificial

### PRÓXIMA SEMANA (nice-to-have):
- [ ] Adicionar 2FA enforcement para admins
- [ ] Configurar alertas no Sentry
- [ ] Revisar Dependabot PRs semanalmente

---

## 6. Testes Rápidos

### Testar 2FA Setup:
```bash
curl -X POST http://localhost:3000/api/admin/2fa/setup \
  -H "Authorization: Bearer [seu-token]" \
  -H "Content-Type: application/json"
```

### Testar Sentry:
```typescript
// No navegador console:
throw new Error('Test Sentry error');
// Aparecerá em Sentry dashboard em 5 segundos
```

### Testar Rate Limiting:
```bash
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -d '{"email":"test","password":"test"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```
Deve bloquear na 6ª tentativa com status 429.

---

## 7. Documentação

- `SECURITY.md` - Guia geral de segurança
- `SECURITY_AUDIT.md` - Auditoria detalhada
- Este arquivo - Setup específico de 2FA e Sentry

---

**Último update:** 2026-07-11
**Status:** Pronto para implementação
