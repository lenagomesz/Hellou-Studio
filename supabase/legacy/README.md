# SQL legado — não executar

Os arquivos desta pasta existem apenas como histórico de versões antigas.

Eles **não fazem parte do fluxo de migração atual** e alguns contêm políticas
permissivas ou comandos que desativavam RLS durante o desenvolvimento inicial.
Executá-los depois das migrações atuais pode enfraquecer a segurança do banco.

Para instalações e atualizações, execute exclusivamente os arquivos de
`supabase/migrations`, em ordem cronológica. O script de validação do projeto
também considera somente essa pasta.
