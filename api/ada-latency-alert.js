/**
 * Vercel Cron Job — Ada Latency Alert
 *
 * Runs at 10:00 BRT (13:00 UTC) on weekdays (Mon–Fri).
 * Finds every *active* project with no task activity for more than 100 days
 * and sends a polite Humand DM from Ada to each team member.
 *
 * Environment variables required (configure in Vercel dashboard):
 *   SUPABASE_URL             — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service-role key (bypasses RLS)
 *   HUMAND_AUTH              — "Basic <base64>" auth header value
 *   CRON_SECRET              — Secret that Vercel sends in Authorization header
 */

import { createClient } from '@supabase/supabase-js';

// ── Constants ──────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://vzlgssqtzerleeskhzmo.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bGdzc3F0emVybGVlc2toem1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwNDIyMywiZXhwIjoyMDc5NjgwMjIzfQ.bGpEOAup4ayfj1pZO-uwNCG3DAAvxJXV6l_OfNtwvKE';

const HUMAND_BASE_URL = 'https://api-prod.humand.co/api/v1';
const HUMAND_AUTH =
  process.env.HUMAND_AUTH ||
  'Basic ODQwNDU3NjpqMVdzTDVwRnB5QlgteEhHTjNtMDNWc3djSDJMTFhYMg==';

/** Minimum idle days to trigger an alert */
const IDLE_THRESHOLD_DAYS = 100;

// ── ULID helper (required as Idempotency-Key) ──────────────────────────────────

function ulid() {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let t = Date.now();
  let tEnc = '';
  for (let i = 0; i < 10; i++) { tEnc = chars[t % 32] + tEnc; t = Math.floor(t / 32); }
  let rEnc = '';
  for (let i = 0; i < 16; i++) rEnc += chars[Math.floor(Math.random() * 32)];
  return tEnc + rEnc;
}

function humandHeaders() {
  return {
    Authorization: HUMAND_AUTH,
    'Content-Type': 'application/json',
    'Idempotency-Key': ulid(),
  };
}

// ── Humand helpers ─────────────────────────────────────────────────────────────

/**
 * Opens (or retrieves) a DM channel for a user identified by their
 * employee_internal_id (CPF or similar external ID in Humand).
 */
async function openChannel(externalId) {
  const res = await fetch(`${HUMAND_BASE_URL}/marty/conversations.open`, {
    method: 'POST',
    headers: humandHeaders(),
    body: JSON.stringify({ external_ids: [externalId] }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`conversations.open failed for ${externalId}: ${JSON.stringify(data)}`);
  return data.channel.id;
}

/** Sends a text message to a Humand channel. */
async function postMessage(channelId, text) {
  const res = await fetch(`${HUMAND_BASE_URL}/marty/chat.postMessage`, {
    method: 'POST',
    headers: humandHeaders(),
    body: JSON.stringify({ channel: channelId, text, mrkdwn: false }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`chat.postMessage failed for channel ${channelId}: ${JSON.stringify(data)}`);
  return data.ts;
}

/** Builds Ada's alert message for a specific project and idle-day count. */
function buildAlertMessage(projectName, idleDays) {
  return (
    `Olá! Meu nome é Ada, assistente virtual do Daher Plan.\n\n` +
    `Gostaria de informar que o projeto "${projectName}" está registrado como ativo, porém não apresenta nenhuma movimentação de tarefas há ${idleDays} dias.\n\n` +
    `Para manter o painel do time sempre atualizado e fiel à realidade, peço gentilmente que verifique a situação deste projeto:\n\n` +
    `• Caso o projeto não esteja mais em andamento, por favor atualize seu status para "Arquivado".\n` +
    `• Caso esteja temporariamente pausado, altere o status para "Em Espera".\n` +
    `• Se o projeto ainda estiver ativo, basta registrar qualquer atividade para manter o histórico em dia.\n\n` +
    `Agradeço a atenção e fico à disposição para qualquer dúvida.\n\n` +
    `Atenciosamente,\nAda — Daher Plan`
  );
}

// ── Main handler ───────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Vercel forwards cron requests as GET with an Authorization header
  // containing the CRON_SECRET. Reject anything else to prevent abuse.
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Extra safety: only run on weekdays (redundant given cron schedule, but
  // useful when the endpoint is triggered manually for testing).
  const nowUtc = new Date();
  const dayOfWeek = nowUtc.getUTCDay(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return res.status(200).json({ message: 'Skipped — weekend', sent: 0 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const log = [];
  let totalSent = 0;

  try {
    // ── 1. Load all active projects ──────────────────────────────────────────
    const { data: activeProjects, error: projErr } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active');

    if (projErr) throw new Error(`Failed to fetch projects: ${projErr.message}`);
    if (!activeProjects || activeProjects.length === 0) {
      return res.status(200).json({ message: 'No active projects found', sent: 0 });
    }

    const activeIds = activeProjects.map((p) => p.id);

    // ── 2. Fetch task timestamps for those projects ──────────────────────────
    const { data: taskRows, error: taskErr } = await supabase
      .from('tasks')
      .select('project_id, created_at, updated_at, completed_at')
      .in('project_id', activeIds);

    if (taskErr) throw new Error(`Failed to fetch tasks: ${taskErr.message}`);

    // Build map: project_id → latest activity ms
    const latestMs = new Map();
    for (const row of taskRows ?? []) {
      const candidates = [row.created_at, row.updated_at, row.completed_at]
        .filter(Boolean)
        .map((t) => new Date(t).getTime())
        .filter((n) => !isNaN(n));
      if (candidates.length === 0) continue;
      const ts = Math.max(...candidates);
      const prev = latestMs.get(row.project_id) ?? 0;
      if (ts > prev) latestMs.set(row.project_id, ts);
    }

    // ── 3. Filter projects with idleDays > 100 ───────────────────────────────
    const nowMs = Date.now();
    const staleProjects = activeProjects
      .map((p) => {
        const maxTs = latestMs.get(p.id) ?? null;
        const idleDays = maxTs !== null
          ? Math.floor((nowMs - maxTs) / 86_400_000)
          : null; // null = no tasks at all
        return { ...p, idleDays };
      })
      .filter((p) => p.idleDays !== null && p.idleDays > IDLE_THRESHOLD_DAYS);

    if (staleProjects.length === 0) {
      return res.status(200).json({
        message: `No active projects exceed ${IDLE_THRESHOLD_DAYS} idle days`,
        sent: 0,
      });
    }

    // ── 4. For each stale project, resolve team members ──────────────────────
    for (const project of staleProjects) {
      // Collect team IDs via both sprints and project_teams (mirrors frontend logic)
      const [{ data: sprintRows }, { data: ptRows }] = await Promise.all([
        supabase.from('sprints').select('team_id').eq('project_id', project.id),
        supabase.from('project_teams').select('team_id').eq('project_id', project.id),
      ]);

      const teamIds = [
        ...(sprintRows ?? []).map((r) => r.team_id),
        ...(ptRows ?? []).map((r) => r.team_id),
      ].filter(Boolean);

      const uniqueTeamIds = [...new Set(teamIds)];

      if (uniqueTeamIds.length === 0) {
        log.push({ project: project.name, skipped: 'no teams found' });
        continue;
      }

      // Get all members with their Humand external ID
      const { data: members, error: membErr } = await supabase
        .from('team_members')
        .select(`
          user_id,
          profiles:profiles!team_members_user_id_fkey(
            full_name, employee_internal_id
          )
        `)
        .in('team_id', uniqueTeamIds);

      if (membErr) {
        log.push({ project: project.name, error: membErr.message });
        continue;
      }

      // De-duplicate by user_id so members in multiple teams get only one message
      const seen = new Set();
      const uniqueMembers = (members ?? []).filter((m) => {
        if (seen.has(m.user_id)) return false;
        seen.add(m.user_id);
        return true;
      });

      const message = buildAlertMessage(project.name, project.idleDays);

      // ── 5. Send Humand message to each member ────────────────────────────
      for (const member of uniqueMembers) {
        const externalId = member.profiles?.employee_internal_id;
        const memberName = member.profiles?.full_name ?? member.user_id;

        if (!externalId) {
          log.push({
            project: project.name,
            member: memberName,
            skipped: 'no employee_internal_id',
          });
          continue;
        }

        try {
          const channelId = await openChannel(externalId);
          await postMessage(channelId, message);
          totalSent++;
          log.push({ project: project.name, member: memberName, status: 'sent' });
        } catch (err) {
          log.push({ project: project.name, member: memberName, error: err.message });
        }
      }
    }

    return res.status(200).json({
      message: 'Ada latency alert completed',
      staleProjects: staleProjects.map((p) => ({ name: p.name, idleDays: p.idleDays })),
      totalSent,
      log,
    });
  } catch (err) {
    console.error('ada-latency-alert error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error', log });
  }
}
