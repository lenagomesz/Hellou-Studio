# Testes E2E de compra

A suíte usa Playwright e percorre o site pelo Chromium como uma pessoa real. Ela cobre cadastro, login, produto comum, produto personalizado obrigatório, carrinho, cupom, endereço, frete, PIX, cartão de teste, rejeição de webhook inválido, pedido no painel administrativo, entrega, avaliação e download de STL.

## Base isolada

Use um projeto Supabase exclusivo para testes. Nunca execute a suíte contra a base de produção: ela cria usuários, pagamentos de sandbox, pedidos e avaliações.

Cadastre nessa base:

- um produto físico ativo;
- um produto físico ativo com `is_customizable = true`;
- um STL ativo com arquivo válido no bucket `stl-uploads`;
- um cupom ativo;
- uma conta administrativa sem 2FA para a automação.

Copie `.env.e2e.example` para `.env.e2e.local` e preencha as credenciais da aplicação, do projeto Supabase isolado, do sandbox do Mercado Pago e os IDs das fixtures. O Playwright carrega esse arquivo automaticamente. O cartão deve ser fornecido pelo ambiente de testes do Mercado Pago e pertencer a uma conta compradora de teste.

`E2E_EMAIL_DOMAIN` aceita tanto um domínio catch-all quanto um e-mail completo. Com um Gmail completo, a suíte cria aliases como `seunome+e2e-123@gmail.com`, permitindo receber as mensagens sem criar uma caixa nova.

Não deixe valores como `uuid-do-produto`, `COLOQUE_AQUI` ou a senha demonstrativa do arquivo de exemplo. A validação inicial rejeita placeholders antes de abrir o navegador.

## Execução local

```bash
Copy-Item .env.e2e.example .env.e2e.local
# Preencha .env.e2e.local antes de continuar.
npx playwright install chromium
npm run quality:deploy
npm run test:e2e
```

No Windows/PowerShell, execute os comandos acima na raiz do projeto. O Playwright gera um novo build com `.env.e2e.local` e inicia o servidor quando `E2E_BASE_URL` não está definida. Se já houver um servidor compatível rodando, ele será reutilizado.

## Bloqueio de deploy

O `vercel.json` usa `npm run quality:deploy`, portanto lint, testes unitários, verificação das migrações, TypeScript e build precisam passar antes do deploy da Vercel.

O workflow `.github/workflows/quality-gate.yml` acrescenta a suíte E2E. Configure os secrets e variables descritos nele e marque o check `Quality gate / validate` como obrigatório na proteção da branch `main`. Assim um pull request não pode ser integrado quando qualquer jornada falhar.
