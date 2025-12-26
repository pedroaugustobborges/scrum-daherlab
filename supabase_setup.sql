-- ================================================
-- DAHER LAB - SCRUM DASHBOARD DATABASE SETUP
-- ================================================
-- Execute este script no SQL Editor do Supabase
-- Versão: 1.0
-- Data: Novembro 2025
-- ================================================

-- ================================================
-- 1. HABILITAR EXTENSÕES
-- ================================================

-- Habilitar UUID para geração automática de IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 2. TABELAS PRINCIPAIS
-- ================================================

-- 2.1 Tabela de Perfis de Usuários
-- Estende a tabela auth.users do Supabase com informações adicionais
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'scrum_master', 'product_owner', 'developer', 'member')),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2.2 Tabela de Projetos
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on-hold', 'completed', 'archived')),
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2.3 Tabela de Times
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2.4 Tabela de Membros dos Times
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('scrum_master', 'product_owner', 'developer', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(team_id, user_id)
);

-- 2.5 Tabela de Sprints
CREATE TABLE IF NOT EXISTS public.sprints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    velocity INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- 2.6 Tabela de Tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'review', 'done', 'blocked')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    story_points INTEGER CHECK (story_points >= 0 AND story_points <= 100),
    sprint_id UUID REFERENCES public.sprints(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_index INTEGER DEFAULT 0,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2.7 Tabela de Comentários
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2.8 Tabela de Atividades/Logs
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'sprint', 'task', 'team', 'comment')),
    entity_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- ================================================

-- Índices para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON public.tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_sprints_team_id ON public.sprints(team_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON public.sprints(status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

-- ================================================
-- 4. FUNÇÕES E TRIGGERS
-- ================================================

-- 4.1 Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Triggers para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON public.sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.3 Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Trigger para criar perfil quando novo usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.5 Função para registrar atividades automaticamente
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_text TEXT;
    entity_type_text TEXT;
BEGIN
    -- Determinar o tipo de ação
    IF (TG_OP = 'INSERT') THEN
        action_text := 'created';
    ELSIF (TG_OP = 'UPDATE') THEN
        action_text := 'updated';
    ELSIF (TG_OP = 'DELETE') THEN
        action_text := 'deleted';
    END IF;

    -- Determinar o tipo de entidade baseado na tabela
    entity_type_text := CASE TG_TABLE_NAME
        WHEN 'projects' THEN 'project'
        WHEN 'sprints' THEN 'sprint'
        WHEN 'tasks' THEN 'task'
        WHEN 'teams' THEN 'team'
        WHEN 'comments' THEN 'comment'
    END;

    -- Inserir log de atividade
    INSERT INTO public.activities (user_id, action, entity_type, entity_id, details)
    VALUES (
        COALESCE(NEW.created_by, NEW.user_id, auth.uid()),
        action_text,
        entity_type_text,
        COALESCE(NEW.id, OLD.id),
        to_jsonb(COALESCE(NEW, OLD))
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ================================================

-- 5.1 Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 5.2 Políticas para Profiles
-- Usuários podem ver todos os perfis
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 5.3 Políticas para Projects
-- Qualquer usuário autenticado pode ver projetos
CREATE POLICY "Projects are viewable by authenticated users"
    ON public.projects FOR SELECT
    USING (auth.role() = 'authenticated');

-- Qualquer usuário autenticado pode criar projetos
CREATE POLICY "Authenticated users can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Usuários podem atualizar projetos que criaram
CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (created_by = auth.uid());

-- Usuários podem deletar projetos que criaram
CREATE POLICY "Users can delete own projects"
    ON public.projects FOR DELETE
    USING (created_by = auth.uid());

-- 5.4 Políticas para Teams
CREATE POLICY "Teams are viewable by authenticated users"
    ON public.teams FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create teams"
    ON public.teams FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own teams"
    ON public.teams FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete own teams"
    ON public.teams FOR DELETE
    USING (created_by = auth.uid());

-- 5.5 Políticas para Team Members
CREATE POLICY "Team members are viewable by authenticated users"
    ON public.team_members FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas membros do time ou criadores do time podem adicionar membros
CREATE POLICY "Team members can be added by team creators"
    ON public.team_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.teams
            WHERE id = team_id AND created_by = auth.uid()
        )
    );

-- Usuários podem sair do time ou criadores podem remover membros
CREATE POLICY "Users can leave team or creators can remove members"
    ON public.team_members FOR DELETE
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.teams
            WHERE id = team_id AND created_by = auth.uid()
        )
    );

-- 5.6 Políticas para Sprints
CREATE POLICY "Sprints are viewable by authenticated users"
    ON public.sprints FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create sprints"
    ON public.sprints FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Membros do time podem atualizar sprints
CREATE POLICY "Team members can update sprints"
    ON public.sprints FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_id = sprints.team_id AND user_id = auth.uid()
        )
    );

-- Criadores ou membros do time podem deletar sprints
CREATE POLICY "Team members can delete sprints"
    ON public.sprints FOR DELETE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_id = sprints.team_id AND user_id = auth.uid()
        )
    );

-- 5.7 Políticas para Tasks
CREATE POLICY "Tasks are viewable by authenticated users"
    ON public.tasks FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Qualquer usuário autenticado pode atualizar tarefas
CREATE POLICY "Authenticated users can update tasks"
    ON public.tasks FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Criadores podem deletar tarefas
CREATE POLICY "Task creators can delete tasks"
    ON public.tasks FOR DELETE
    USING (created_by = auth.uid());

-- 5.8 Políticas para Comments
CREATE POLICY "Comments are viewable by authenticated users"
    ON public.comments FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update own comments"
    ON public.comments FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
    ON public.comments FOR DELETE
    USING (user_id = auth.uid());

-- 5.9 Políticas para Activities
CREATE POLICY "Activities are viewable by authenticated users"
    ON public.activities FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas o sistema pode inserir atividades (via triggers)
CREATE POLICY "Activities can only be inserted by system"
    ON public.activities FOR INSERT
    WITH CHECK (false);

-- ================================================
-- 6. DADOS INICIAIS (OPCIONAL)
-- ================================================

-- Você pode adicionar dados de exemplo aqui se necessário
-- Por exemplo:

-- INSERT INTO public.teams (name, description) VALUES
--     ('Time de Desenvolvimento', 'Time principal de desenvolvimento de software'),
--     ('Time de Produto', 'Time responsável pela gestão de produto');

-- ================================================
-- 7. VIEWS ÚTEIS
-- ================================================

-- 7.1 View para estatísticas de sprint
CREATE OR REPLACE VIEW public.sprint_statistics AS
SELECT
    s.id AS sprint_id,
    s.name AS sprint_name,
    s.status AS sprint_status,
    COUNT(t.id) AS total_tasks,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN t.status = 'in-progress' THEN 1 END) AS in_progress_tasks,
    COUNT(CASE WHEN t.status = 'todo' THEN 1 END) AS todo_tasks,
    COUNT(CASE WHEN t.status = 'blocked' THEN 1 END) AS blocked_tasks,
    SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END) AS completed_points,
    SUM(t.story_points) AS total_points,
    CASE
        WHEN SUM(t.story_points) > 0 THEN
            ROUND((SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END)::numeric / SUM(t.story_points)::numeric) * 100, 2)
        ELSE 0
    END AS completion_percentage
FROM public.sprints s
LEFT JOIN public.tasks t ON s.id = t.sprint_id
GROUP BY s.id, s.name, s.status;

-- 7.2 View para atividades recentes do usuário
CREATE OR REPLACE VIEW public.user_recent_activities AS
SELECT
    a.id,
    a.action,
    a.entity_type,
    a.entity_id,
    a.created_at,
    p.full_name AS user_name,
    p.avatar_url AS user_avatar
FROM public.activities a
LEFT JOIN public.profiles p ON a.user_id = p.id
ORDER BY a.created_at DESC
LIMIT 100;

-- ================================================
-- 8. FUNÇÕES AUXILIARES
-- ================================================

-- 8.1 Função para obter membros de um time
CREATE OR REPLACE FUNCTION get_team_members(team_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.avatar_url,
        tm.role,
        tm.joined_at
    FROM public.team_members tm
    JOIN public.profiles p ON tm.user_id = p.id
    WHERE tm.team_id = team_uuid
    ORDER BY tm.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.2 Função para obter tarefas de um sprint
CREATE OR REPLACE FUNCTION get_sprint_tasks(sprint_uuid UUID)
RETURNS TABLE (
    task_id UUID,
    title TEXT,
    status TEXT,
    priority TEXT,
    story_points INTEGER,
    assigned_to_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.title,
        t.status,
        t.priority,
        t.story_points,
        p.full_name,
        t.created_at
    FROM public.tasks t
    LEFT JOIN public.profiles p ON t.assigned_to = p.id
    WHERE t.sprint_id = sprint_uuid
    ORDER BY t.order_index, t.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- FIM DO SCRIPT
-- ================================================

-- Para verificar se tudo foi criado corretamente, execute:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

COMMENT ON TABLE public.profiles IS 'Perfis estendidos dos usuários';
COMMENT ON TABLE public.projects IS 'Projetos gerenciados no sistema';
COMMENT ON TABLE public.teams IS 'Times de desenvolvimento';
COMMENT ON TABLE public.team_members IS 'Membros pertencentes aos times';
COMMENT ON TABLE public.sprints IS 'Sprints do SCRUM';
COMMENT ON TABLE public.tasks IS 'Tarefas/histórias de usuário';
COMMENT ON TABLE public.comments IS 'Comentários nas tarefas';
COMMENT ON TABLE public.activities IS 'Log de atividades do sistema';
