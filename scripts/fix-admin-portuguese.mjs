import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const roots = ['app/dashboard', 'components/admin'];
const replacements = new Map([
  ['Usuarios', 'Usuários'], ['usuarios', 'usuários'], ['Usuario', 'Usuário'], ['usuario', 'usuário'],
  ['Acoes', 'Ações'], ['acoes', 'ações'], ['Acao', 'Ação'], ['acao', 'ação'],
  ['Configuracoes', 'Configurações'], ['configuracoes', 'configurações'], ['Configuracao', 'Configuração'], ['configuracao', 'configuração'],
  ['Historico', 'Histórico'], ['historico', 'histórico'], ['Critico', 'Crítico'], ['critico', 'crítico'],
  ['Variacoes', 'Variações'], ['variacoes', 'variações'], ['Variacao', 'Variação'], ['variacao', 'variação'],
  ['Reposicoes', 'Reposições'], ['reposicoes', 'reposições'], ['Reposicao', 'Reposição'],
  ['reposicao', 'reposição'],
  ['Movimentacoes', 'Movimentações'], ['movimentacoes', 'movimentações'], ['Previsoes', 'Previsões'], ['previsoes', 'previsões'],
  ['Previsao', 'Previsão'], ['previsao', 'previsão'], ['Producao', 'Produção'], ['producao', 'produção'],
  ['Solicitacoes', 'Solicitações'], ['solicitacoes', 'solicitações'], ['Solicitacao', 'Solicitação'], ['solicitacao', 'solicitação'],
  ['Avaliacoes', 'Avaliações'], ['avaliacoes', 'avaliações'], ['Avaliacao', 'Avaliação'], ['avaliacao', 'avaliação'],
  ['Descricao', 'Descrição'], ['descricao', 'descrição'], ['Observacoes', 'Observações'], ['observacoes', 'observações'],
  ['Evolucao', 'Evolução'], ['evolucao', 'evolução'], ['Alteracoes', 'Alterações'], ['alteracoes', 'alterações'],
  ['Alteracao', 'Alteração'], ['alteracao', 'alteração'], ['Visualizacao', 'Visualização'], ['visualizacao', 'visualização'],
  ['Periodo', 'Período'], ['periodo', 'período'], ['Pagina', 'Página'], ['pagina', 'página'],
  ['Preco', 'Preço'], ['Precos', 'Preços'], ['Saidas', 'Saídas'], ['saidas', 'saídas'],
  ['preco', 'preço'], ['CRITICO', 'CRÍTICO'],
  ['Nao', 'Não'], ['nao', 'não'], ['Possivel', 'Possível'], ['possivel', 'possível'],
  ['Disponivel', 'Disponível'], ['disponivel', 'disponível'], ['Ultimos', 'Últimos'], ['ultimos', 'últimos'],
  ['Dependencia', 'Dependência'], ['necessario', 'necessário'], ['Necessario', 'Necessário'],
  ['Area', 'Área'], ['area', 'área'], ['Titulo', 'Título'], ['titulo', 'título'],
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function correct(text) {
  let result = text;
  for (const [from, to] of replacements) {
    result = result.replace(new RegExp(`(?<![\\p{L}])${from}(?![\\p{L}])`, 'gu'), to);
  }
  return result;
}

for (const file of roots.flatMap(walk)) {
  const source = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];

  function visit(node) {
    if (ts.isJsxText(node)) {
      const value = node.getText(sourceFile);
      const next = correct(value);
      if (next !== value) edits.push([node.getStart(sourceFile), node.getEnd(), next]);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const start = node.getStart(sourceFile) + 1;
      const end = node.getEnd() - 1;
      const value = source.slice(start, end);
      // Não altera chaves internas, slugs, nomes de campos ou valores de enum.
      if (!/^[a-z0-9_./:-]+$/.test(value)) {
        const next = correct(value);
        if (next !== value) edits.push([start, end, next]);
      }
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const startOffset = ts.isTemplateHead(node) ? 1 : 1;
      const endOffset = ts.isTemplateTail(node) ? 1 : 2;
      const start = node.getStart(sourceFile) + startOffset;
      const end = node.getEnd() - endOffset;
      const value = source.slice(start, end);
      const next = correct(value);
      if (next !== value) edits.push([start, end, next]);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (edits.length) {
    let output = source;
    for (const [start, end, value] of edits.sort((a, b) => b[0] - a[0])) {
      output = output.slice(0, start) + value + output.slice(end);
    }
    fs.writeFileSync(file, output, 'utf8');
  }
}
