# 🗄️ Configuração do Banco de Dados Supabase

## Guia de Instalação do Banco de Dados para o Painel SCRUM Daher Lab

Este documento explica como configurar o banco de dados Supabase para o sistema de gerenciamento SCRUM.

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Projeto Supabase criado (você já tem um configurado no `.env`)
- Acesso ao SQL Editor do Supabase

## 🚀 Passo a Passo

### 1. Acessar o SQL Editor do Supabase

1. Faça login em [https://app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto (vzlgssqtzerleeskhzmo)
3. No menu lateral, clique em **SQL Editor**

### 2. Executar o Script de Configuração

1. Clique em **New query** no SQL Editor
2. Copie todo o conteúdo do arquivo `supabase_setup.sql`
3. Cole no editor SQL
4. Clique em **Run** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

O script levará alguns segundos para executar. Você verá uma mensagem de sucesso quando concluído.

### 3. Verificar a Instalação

Execute o seguinte comando no SQL Editor para verificar se todas as tabelas foram criadas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Você deve ver as seguintes tabelas:
- ✅ `activities`
- ✅ `comments`
- ✅ `profiles`
- ✅ `projects`
- ✅ `sprints`
- ✅ `tasks`
- ✅ `team_members`
- ✅ `teams`

### 4. Verificar Políticas de Segurança (RLS)

Para verificar se todas as políticas de segurança foram criadas:

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 📊 Estrutura do Banco de Dados

### Diagrama de Relacionamentos

```
auth.users (Supabase Auth)
    ↓
profiles (Perfis de Usuários)
    ↓
    ├─→ teams (Times)
    │      ↓
    │   team_members (Membros dos Times)
    │      ↓
    │   sprints (Sprints)
    │      ↓
    ├─→ projects (Projetos)
    │      ↓
    └─→ tasks (Tarefas)
           ↓
        comments (Comentários)

activities (Log de Atividades)
```

### Principais Tabelas

#### 1. **profiles**
Armazena informações adicionais dos usuários
- `id`: UUID do usuário (referência a auth.users)
- `full_name`: Nome completo
- `avatar_url`: URL do avatar
- `role`: Papel no sistema (admin, scrum_master, etc.)

#### 2. **projects**
Gerencia os projetos
- `name`: Nome do projeto
- `description`: Descrição
- `status`: active, on-hold, completed, archived
- `start_date` / `end_date`: Datas do projeto

#### 3. **teams**
Times de desenvolvimento
- `name`: Nome do time
- `description`: Descrição do time

#### 4. **team_members**
Relaciona usuários com times
- `team_id`: ID do time
- `user_id`: ID do usuário
- `role`: Papel no time (scrum_master, developer, etc.)

#### 5. **sprints**
Sprints do SCRUM
- `name`: Nome do sprint
- `goal`: Meta do sprint
- `start_date` / `end_date`: Período do sprint
- `status`: planning, active, completed, cancelled
- `team_id`: Time responsável

#### 6. **tasks**
Tarefas/histórias de usuário
- `title`: Título da tarefa
- `description`: Descrição detalhada
- `status`: todo, in-progress, review, done, blocked
- `priority`: low, medium, high, urgent
- `story_points`: Pontos de história
- `sprint_id`: Sprint associado
- `assigned_to`: Usuário responsável

#### 7. **comments**
Comentários nas tarefas
- `task_id`: Tarefa relacionada
- `user_id`: Autor do comentário
- `content`: Conteúdo do comentário

#### 8. **activities**
Log de todas as atividades do sistema
- `action`: Ação realizada (created, updated, deleted)
- `entity_type`: Tipo de entidade (project, sprint, task, etc.)
- `entity_id`: ID da entidade
- `details`: Detalhes em JSON

## 🔒 Segurança (Row Level Security)

O sistema implementa RLS (Row Level Security) para garantir que:

- ✅ Usuários só podem editar seus próprios perfis
- ✅ Projetos só podem ser editados/deletados por quem os criou
- ✅ Times só podem ser gerenciados por seus criadores
- ✅ Membros de times podem gerenciar sprints e tarefas
- ✅ Usuários só podem comentar com sua própria identidade
- ✅ Logs de atividade são somente leitura

## 🔄 Triggers Automáticos

O banco de dados possui triggers que automaticamente:

1. **Atualizam `updated_at`**: Toda vez que um registro é modificado
2. **Criam perfil de usuário**: Quando um novo usuário se registra
3. **Registram atividades**: Mantém log de todas as mudanças importantes

## 📈 Views Úteis

### `sprint_statistics`
Estatísticas agregadas de cada sprint:
```sql
SELECT * FROM public.sprint_statistics WHERE sprint_id = '<seu-sprint-id>';
```

Retorna:
- Total de tarefas
- Tarefas concluídas, em progresso, a fazer
- Story points completos vs totais
- Porcentagem de conclusão

### `user_recent_activities`
Últimas 100 atividades do sistema:
```sql
SELECT * FROM public.user_recent_activities LIMIT 10;
```

## 🛠️ Funções Auxiliares

### `get_team_members(team_uuid)`
Retorna todos os membros de um time:
```sql
SELECT * FROM get_team_members('<team-uuid>');
```

### `get_sprint_tasks(sprint_uuid)`
Retorna todas as tarefas de um sprint:
```sql
SELECT * FROM get_sprint_tasks('<sprint-uuid>');
```

## 📝 Dados de Exemplo (Opcional)

Se quiser adicionar dados de exemplo para testar, execute:

```sql
-- Criar um projeto de exemplo
INSERT INTO public.projects (name, description, status)
VALUES ('Projeto Piloto', 'Primeiro projeto do sistema SCRUM', 'active')
RETURNING id;

-- Criar um time de exemplo
INSERT INTO public.teams (name, description)
VALUES ('Time Alpha', 'Time de desenvolvimento principal')
RETURNING id;
```

## 🔍 Consultas Úteis

### Ver todos os sprints ativos
```sql
SELECT * FROM public.sprints
WHERE status = 'active'
ORDER BY start_date DESC;
```

### Ver tarefas em progresso
```sql
SELECT t.*, p.full_name as assigned_to_name
FROM public.tasks t
LEFT JOIN public.profiles p ON t.assigned_to = p.id
WHERE t.status = 'in-progress'
ORDER BY t.priority DESC;
```

### Ver atividade recente
```sql
SELECT * FROM public.activities
ORDER BY created_at DESC
LIMIT 20;
```

## 🆘 Solução de Problemas

### Erro: "relation already exists"
Se você receber este erro, significa que algumas tabelas já existem. Você pode:
1. Deletar as tabelas existentes primeiro, ou
2. Comentar as linhas de criação dessas tabelas no script

### Erro de permissão
Certifique-se de estar executando o script como usuário com permissões de administrador no Supabase.

### RLS bloqueando acesso
Se você não conseguir acessar dados, verifique se:
1. O usuário está autenticado
2. As políticas RLS estão corretas
3. O usuário tem permissão para acessar aqueles dados

## 📚 Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Guia de Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🔄 Atualizações Futuras

Para adicionar novas tabelas ou modificar o schema:

1. Crie um novo arquivo SQL com as mudanças
2. Documente as alterações neste README
3. Execute o novo script no SQL Editor
4. Atualize os types no TypeScript (`src/types/index.ts`)

---

**Última atualização**: Novembro 2025
**Mantido por**: Equipe de Desenvolvimento Daher Lab
