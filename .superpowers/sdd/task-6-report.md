# Task 6 Report: Blog Approval API

## Status: DONE

## What was done

Created PATCH endpoint at `app/api/admin/ai/blog-approval/route.ts` that allows admins to approve (publish) or reject (delete) draft blog posts.

### Endpoint Details

- **Route**: `PATCH /api/admin/ai/blog-approval`
- **Permission**: `settings.manage` (admin only)
- **Runtime**: nodejs

### Request Body

```json
{
  "postId": "uuid-do-post",
  "action": "approve" | "reject",
  "updates": {
    "title": "Titulo editado (opcional)",
    "excerpt": "Resumo editado (opcional)",
    "content": "Conteudo editado (opcional)",
    "seo_keywords": ["palavras", "chave", "opcionais"]
  }
}
```

### Behavior

- **approve**: Atualiza status para `published`, define `published_at` automaticamente (via `updateBlogPost`). Aceita edicoes opcionais antes de publicar.
- **reject**: Exclui o post permanentemente (via `deleteBlogPost`).

### Validation

- `postId` obrigatorio
- `action` obrigatorio e deve ser `approve` ou `reject`
- Body deve ser JSON valido
- Todas as mensagens de erro em portugues (pt-BR)

## Files created

- `app/api/admin/ai/blog-approval/route.ts` - Endpoint PATCH
- `app/api/admin/ai/blog-approval/__tests__/route.test.ts` - 13 testes de integracao

## Testing

- **Vitest**: 13 testes passando (autorizacao, validacao, approve, reject)
- **TypeScript**: PASS (sem erros no arquivo)
- **Next.js build**: PASS (rota compilada com sucesso)

## Test Coverage

| Categoria | Testes |
|-----------|--------|
| Autorizacao | 3 (permissao, 403 sem permissao, 401 sem autenticacao) |
| Validacao | 4 (postId ausente, action ausente, action invalida, JSON invalido) |
| Approve | 4 (publicar, edicoes opcionais, seo_keywords, erro 500) |
| Reject | 2 (excluir, erro 500) |

## Base Commit

7077c0f
