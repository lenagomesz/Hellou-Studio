# Autenticação 2FA - Documentação de Segurança

## Resumo das Medidas de Segurança Implementadas

### 1. Geração Criptograficamente Segura de Backup Codes
**Problema anterior:** Usava `Math.random()` que não é seguro para fins criptográficos.
**Solução:** Implementado uso de `crypto.randomBytes()` para gerar 6 bytes aleatórios em formato hexadecimal.

```typescript
// Antes (inseguro)
Math.random().toString(36).substring(2, 10).toUpperCase()

// Depois (seguro)
randomBytes(6).toString('hex').toUpperCase()
```

### 2. Hash dos Backup Codes no Banco de Dados
**Problema anterior:** Backup codes armazenados em plaintext, arriscando exposição em caso de vazamento do banco.
**Solução:** Todos os backup codes são hasheados com SHA-256 antes de salvar no banco.

```typescript
export function hashBackupCode(code: string): string {
  const normalized = code.toUpperCase().replace(/\s/g, '');
  return createHash('sha256').update(normalized).digest('hex');
}
```

**Banco de dados:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_backup_codes TEXT[];
-- Armazena array de hashes SHA-256, nunca o código em plaintext
```

### 3. Rate Limiting para Proteção contra Força Bruta
**Problema anterior:** Sem proteção contra múltiplas tentativas de adivinhar códigos.
**Solução:** Máximo 5 tentativas em 15 minutos por usuário.

**Tabela de rastreamento:**
```sql
CREATE TABLE two_fa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Implementação:**
- Máximo 5 tentativas em 15 minutos
- IP address é registrado para auditoria
- Suporta tanto tentativas bem-sucedidas quanto falhadas

### 4. Fluxo de Login com 2FA
**Novo endpoint:** `POST /api/admin/2fa/verify`

**Validações:**
- Verifica rate limiting antes de processar
- Suporta tanto códigos TOTP quanto backup codes
- Atualiza timestamp de última verificação bem-sucedida
- Limpa os backup codes utilizados do banco

### 5. Endpoints Adicionais de Segurança

#### Desabilitar 2FA
`POST /api/admin/2fa/disable`
- Requer código TOTP válido para desabilitar
- Limpa todos os segredos 2FA do banco
- Não deixa dados órfãos

#### Regenerar Backup Codes
`POST /api/admin/2fa/regenerate-backup-codes`
- Gera novo conjunto de 10 códigos
- Invalida códigos antigos automaticamente
- Avisa o usuário que códigos anteriores não funcionarão mais

### 6. Campos de Auditoria
**Novos campos adicionados:**
- `two_fa_last_verified_at` - rastreia última verificação bem-sucedida
- `two_fa_backup_codes_generated_at` - data de geração dos backup codes

## Fluxo de Uso

### Setup Inicial (Administrador)
1. POST `/api/admin/2fa/setup` → Recebe QR code + secret + backup codes
2. Usuário escaneia QR code no autenticador (Google Authenticator, Authy, etc)
3. POST `/api/admin/2fa/confirm` com código TOTP + backup codes
4. Sistema salva secret e hashes dos backup codes

### Verificação de 2FA (Login)
1. Usuário faz login
2. Sistema verifica se 2FA está habilitado
3. POST `/api/admin/2fa/verify` com código TOTP ou backup code
4. Sistema valida rate limiting
5. Se backup code: remove do array de códigos disponíveis
6. Se bem-sucedido: libera acesso

### Regeneração de Backup Codes
1. POST `/api/admin/2fa/regenerate-backup-codes`
2. Recebe 10 novos códigos
3. Códigos antigos são automaticamente invalidados

### Desabilitar 2FA
1. POST `/api/admin/2fa/disable` com código TOTP
2. Sistema remove todos os segredos 2FA
3. Próximo login não requer 2FA

## Padrões de Segurança Implementados

- ✅ **Algoritmos modernos:** SHA-256 para hashing, TOTP com window de 2 (compatível com padrão RFC 6238)
- ✅ **Aleatoriedade criptográfica:** `crypto.randomBytes()` em vez de `Math.random()`
- ✅ **Rate limiting:** Proteção contra força bruta
- ✅ **Auditoria:** IP address e timestamps de tentativas registrados
- ✅ **Recuperação:** Sistema de backup codes para casos de perda de autenticador
- ✅ **Segurança em camadas:** Múltiplas validações antes de liberar acesso

## Dependências

```json
{
  "speakeasy": "^2.0.0",    // TOTP generation e verification
  "qrcode": "^1.5.4"        // QR code generation
}
```

Ambas as bibliotecas são bem mantidas e amplamente usadas em produção.

## Próximos Passos Recomendados

1. **Integração com autenticação:** Modificar middleware de login para exigir 2FA se habilitado
2. **Interface de administrador:** Criar UI para setup/disable de 2FA
3. **Recovery codes backup:** Permitir download/impressão segura dos backup codes
4. **Auditoria avançada:** Dashboard de tentativas de login com 2FA
5. **Notificações:** Alertar usuário quando 2FA é habilitado/desabilitado
6. **MFA adicional:** Considerar adicionar SMS ou email como segunda camada
