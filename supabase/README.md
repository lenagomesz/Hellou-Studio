# Banco de dados da Hellou Studio

Esta pasta separa o que deve ser aplicado no banco atual do que existe apenas
como histórico. Essa distinção evita executar novamente scripts antigos que
criam índices sem proteção ou desativam RLS.

## Estrutura

- `migrations/`: únicas migrações ativas. A ordem é a ordem alfabética dos
  nomes `YYYYMMDD_descricao.sql`.
- `checks/`: consultas somente de leitura para conferir o banco depois de uma
  alteração.
- `bootstrap/schema.sql`: fotografia histórica do esquema inicial. Serve para
  consulta e não deve ser executada no banco de produção existente.
- `legacy/`: scripts antigos, aplicados manualmente ou substituídos. Nunca
  execute essa pasta em lote e não a use como fonte de novas migrações.

## Fluxo seguro

1. Execute `npm run db:check` antes do commit.
2. Crie toda alteração nova em `migrations/`, com nome datado e operação
   idempotente sempre que o PostgreSQL permitir.
3. No Supabase SQL Editor, aplique somente a nova migração, uma por vez. Não
   reaplique um arquivo sem confirmar antes se ele já foi executado.
4. Execute `checks/verify_current_schema.sql`. O primeiro resultado deve vir
   vazio e a consulta de RLS deve retornar todas as tabelas com `rls_enabled`
   igual a `true`.

O projeto ainda não possui `supabase/config.toml` nem histórico remoto
confiável do Supabase CLI. Por isso, `supabase db push` não deve ser usado até
que as migrações já aplicadas sejam reconciliadas com o banco de produção.

## Regras para novas migrações

- Não altere uma migração que já tenha sido executada; crie outra.
- Não coloque tokens, chaves ou dados reais de clientes no SQL.
- Não use `DISABLE ROW LEVEL SECURITY` em migrações novas.
- Políticas abertas com `USING (true)` exigem justificativa e revisão.
- Mudanças destrutivas (`DROP`, conversão de tipo e remoção de coluna) devem
  ter backup e plano de reversão.
