import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrationName = /^\d{8}_[a-z0-9_]+\.sql$/;
const errors = [];

const entries = await readdir(migrationsDir, { withFileTypes: true });
const sqlFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
  .map((entry) => entry.name)
  .sort();

for (const file of sqlFiles) {
  if (!migrationName.test(file)) {
    errors.push(`Migração ativa sem o padrão YYYYMMDD_nome.sql: ${file}`);
  }
}

const looseSupabaseSql = (await readdir(path.join(root, 'supabase'), { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
  .map((entry) => entry.name);

if (looseSupabaseSql.length > 0) {
  errors.push(`SQL solto na raiz de supabase/: ${looseSupabaseSql.join(', ')}`);
}

const obsoleteLocations = [
  path.join(root, 'MIGRATION_COMPLETE.sql'),
  path.join(root, 'migrations'),
];

for (const location of obsoleteLocations) {
  try {
    const locationStat = await stat(location);
    if (locationStat.isFile() && location.endsWith('.sql')) {
      errors.push(`Ainda há SQL fora da estrutura canônica: ${path.relative(root, location)}`);
      continue;
    }
    if (locationStat.isDirectory()) {
      const statEntries = await readdir(location, { withFileTypes: true });
      if (statEntries.some((entry) => entry.isFile() && entry.name.endsWith('.sql'))) {
        errors.push(`Ainda há SQL fora da estrutura canônica: ${path.relative(root, location)}`);
      }
    }
  } catch {
    // Caminho inexistente é o estado esperado.
  }
}

if (sqlFiles.length === 0) {
  errors.push('Nenhuma migração ativa foi encontrada.');
} else {
  const finalMigration = sqlFiles.at(-1);
  const finalSql = await readFile(path.join(migrationsDir, finalMigration), 'utf8');
  if (!/enable row level security/i.test(finalSql)) {
    errors.push(`A migração final (${finalMigration}) não garante RLS.`);
  }
}

if (errors.length > 0) {
  console.error('Falha na organização das migrações:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Migrações organizadas: ${sqlFiles.length} arquivo(s) ativo(s).`);
  console.log('Scripts históricos permanecem isolados em supabase/legacy/.');
}
