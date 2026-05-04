-- ============================================================
-- FIX: Permissões para usuários recriados (novos UUIDs)
-- Problema: DELETE FROM auth.users cascateia para profiles,
--   que cascateia para team_members. Os novos UUIDs ficam
--   sem nenhum team_members → user_has_project_access() retorna
--   FALSE para qualquer projeto com times → sem edição.
-- Solução: reinsere os 3 usuários em todos os times da org
--   com role 'developer' (acesso completo de edição).
-- ============================================================

-- ============================================================
-- PARTE 1: DIAGNÓSTICO (leia antes de rodar a parte 2)
-- ============================================================

-- 1a. Confirma que os usuários existem com novos UUIDs
SELECT
  u.id          AS auth_id,
  u.email,
  p.full_name,
  p.is_admin,
  u.email_confirmed_at,
  i.id IS NOT NULL AS has_identity
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
WHERE u.email IN (
  'gabriel.isaque@agirsaude.org.br',
  'wanderson.braga@agirsaude.org.br',
  'janerson.douglas@agirsaude.org.br'
);

-- 1b. Mostra os times existentes e quantos projetos cada um cobre
SELECT
  t.id   AS team_id,
  t.name AS team_name,
  COUNT(DISTINCT pt.project_id) AS num_projects,
  COUNT(DISTINCT tm.user_id)    AS num_members
FROM public.teams t
LEFT JOIN public.project_teams pt ON pt.team_id = t.id
LEFT JOIN public.team_members  tm ON tm.team_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 1c. Confirma que os 3 usuários NÃO têm team_members (o problema)
SELECT
  p.email,
  p.full_name,
  tm.team_id,
  tm.role
FROM public.profiles p
LEFT JOIN public.team_members tm ON tm.user_id = p.id
WHERE p.email IN (
  'gabriel.isaque@agirsaude.org.br',
  'wanderson.braga@agirsaude.org.br',
  'janerson.douglas@agirsaude.org.br'
);

-- ============================================================
-- PARTE 2: FIX — adiciona os 3 usuários em todos os times
--   como 'developer' (tem edição completa, não é stakeholder)
--   ON CONFLICT DO NOTHING → idempotente, seguro re-rodar
-- ============================================================

INSERT INTO public.team_members (team_id, user_id, role, joined_at)
SELECT
  t.id                    AS team_id,
  p.id                    AS user_id,
  'developer'::text       AS role,
  now()                   AS joined_at
FROM public.teams t
CROSS JOIN public.profiles p
WHERE p.email IN (
  'gabriel.isaque@agirsaude.org.br',
  'wanderson.braga@agirsaude.org.br',
  'janerson.douglas@agirsaude.org.br'
)
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ============================================================
-- PARTE 3: VERIFICAÇÃO — deve retornar linhas para cada usuário
--   em cada time, com role = developer
-- ============================================================

SELECT
  p.full_name,
  p.email,
  t.name  AS team_name,
  tm.role,
  COUNT(DISTINCT pt.project_id) AS projects_accessible
FROM public.profiles p
JOIN public.team_members tm  ON tm.user_id  = p.id
JOIN public.teams t          ON t.id        = tm.team_id
LEFT JOIN public.project_teams pt ON pt.team_id = t.id
WHERE p.email IN (
  'gabriel.isaque@agirsaude.org.br',
  'wanderson.braga@agirsaude.org.br',
  'janerson.douglas@agirsaude.org.br'
)
GROUP BY p.full_name, p.email, t.name, tm.role
ORDER BY p.full_name, t.name;
