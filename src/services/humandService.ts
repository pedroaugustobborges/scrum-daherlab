/**
 * humandService
 *
 * Single-responsibility service for:
 *   - Building milestone congratulation messages
 *   - Building project welcome messages (sent by Ada on project creation)
 *   - Sending messages through the Humand API proxy
 *   - Notifying all team members when a new project is created
 */
import { supabase } from "@/lib/supabase";

// In development Vite serves no serverless functions; skip the call unless
// VITE_HUMAND_PROXY_URL is explicitly set (e.g. pointing to `vercel dev`).
const HUMAND_API_URL: string | null = import.meta.env.DEV
  ? (import.meta.env.VITE_HUMAND_PROXY_URL ?? null)
  : "/api/humand-message";

const HUMAND_ACK_API_URL: string | null = import.meta.env.DEV
  ? (import.meta.env.VITE_HUMAND_ACK_PROXY_URL ?? null)
  : "/api/humand-acknowledgement";

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

/** Converts milliseconds to a human-readable Portuguese string. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "menos de um minuto";

  const totalMinutes = Math.floor(ms / 60_000);
  const totalHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    const dayPart = `${days} dia${days > 1 ? "s" : ""}`;
    const hourPart = hours > 0 ? ` e ${hours}h` : "";
    return dayPart + hourPart;
  }
  if (hours > 0) {
    const minPart = minutes > 0 ? `${minutes}min` : "";
    return `${hours}h${minPart}`;
  }
  return `${totalMinutes} min`;
}

export interface MilestoneMessageParams {
  milestone: number;
  userName: string;
  /** ms to complete this batch of 10 — null when data is unavailable */
  batchDurationMs: number | null;
  /** ms of the previous batch — null on first milestone or data gap */
  previousBatchDurationMs: number | null;
}

/**
 * Builds the congratulation text sent to the user via Humand.
 *
 * Rules:
 *  - Always congratulates.
 *  - When current batch is FASTER than the previous one, highlights the improvement
 *    and shows both durations.
 *  - When current batch is equal or slower (or has no prior), omits timing entirely.
 */
export function buildMilestoneMessage({
  milestone,
  userName,
  batchDurationMs,
  previousBatchDurationMs,
}: MilestoneMessageParams): string {
  const firstName = userName.split(" ")[0];

  const isFaster =
    batchDurationMs !== null &&
    previousBatchDurationMs !== null &&
    batchDurationMs < previousBatchDurationMs;

  const header =
    `Oiê!! ${firstName}, estou passando para te dizer parabéns!! 🎉 \n` +
    `Você concluiu ${milestone} tarefas no Daher Plan!`;

  if (isFaster) {
    const current = formatDuration(batchDurationMs!);
    const previous = formatDuration(previousBatchDurationMs!);
    return (
      `${header}\n\n` +
      `E mais: você está cada vez mais veloz!\n` +
      `  • Bloco anterior de 10 tarefas realizadas foi feito no prazo de: ${previous}\n` +
      `  • Bloco atual:    ${current} 🚀 \n\n` +
      `Continue assim — cada tarefa concluída aproxima você e seus times da realização do propósito de cuidar de vidas! 💪❤️‍🩹\n\n\n\n`
    );
  }

  return (
    `${header}\n\n` +
    `Continue com o ótimo trabalho! O time conta com você para realização de mais um projeto para entregar cuidado com maior qualidade e eficiência à população. 🏥🌟\n\n`
  );
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

/**
 * Sends a text message to a Humand user identified by their external ID (CPF).
 * Calls the /api/humand-message Vercel proxy to keep credentials server-side.
 *
 * Throws on network error; returns false if Humand reports failure.
 */
export async function sendHumandMessage(
  userExternalId: string,
  text: string,
): Promise<boolean> {
  if (!HUMAND_API_URL) {
    console.info(
      "[dev] Humand message skipped (no proxy URL configured):",
      text.slice(0, 80),
    );
    return true;
  }

  const response = await fetch(HUMAND_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userExternalId, text }),
  });

  if (!response.ok) {
    console.error("humandService: proxy returned", response.status);
    return false;
  }

  const data = await response.json();
  return data.success === true;
}

// ---------------------------------------------------------------------------
// Project welcome message
// ---------------------------------------------------------------------------

export interface ProjectWelcomeMessageParams {
  firstName: string;
  projectName: string;
  projectDescription: string;
}

/**
 * Builds the welcome message Ada sends to each team member when a new project
 * is created. The message is intentionally gender-neutral in Portuguese —
 * "você" is used throughout to avoid gendered greetings like "Bem-vindo/a".
 */
export function buildProjectWelcomeMessage({
  firstName,
  projectName,
  projectDescription,
}: ProjectWelcomeMessageParams): string {
  const descriptionLine = projectDescription?.trim()
    ? `\n${projectDescription.trim()}\n`
    : "";

  return (
    `Oi, ${firstName}! 👋\n\n` +
    `Fico muito feliz em saber que você integra o projeto *${projectName}*! 🎉\n` +
    `\n Cuja idealização foi descrita como: \n` +
    descriptionLine +
    `\n\n Incrível, não é? Esse projeto vai entregar otimização real aos processos de saúde — e eu estou animada para começar essa jornada!\n\n` +
    `Estarei aqui com você em cada etapa do caminho, para ajudar a alcançar todos os objetivos deste projeto. Vamos nessa! 🚀❤️‍🩹\n\n`
  );
}

/**
 * After a project is created, fetches every member of the linked teams and
 * sends them a welcome message from Ada via Humand.
 *
 * Silently skips members who haven't registered their CPF (employee_internal_id).
 * Never throws — errors are logged so they don't block the UI flow.
 */
export async function notifyProjectTeamMembers({
  teamIds,
  projectName,
  projectDescription,
}: {
  teamIds: string[];
  projectName: string;
  projectDescription: string;
}): Promise<void> {
  if (!teamIds.length) return;

  try {
    // 1. Collect all user IDs across the selected teams
    const { data: memberships, error: membershipsError } = await supabase
      .from("team_members")
      .select("user_id")
      .in("team_id", teamIds);

    if (membershipsError) {
      console.error(
        "notifyProjectTeamMembers: team_members query failed",
        membershipsError,
      );
      return;
    }

    const uniqueUserIds = [
      ...new Set((memberships ?? []).map((m) => m.user_id as string)),
    ];
    if (!uniqueUserIds.length) return;

    // 2. Fetch profiles to get name + Humand external ID (CPF)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("full_name, employee_internal_id")
      .in("id", uniqueUserIds);

    if (profilesError) {
      console.error(
        "notifyProjectTeamMembers: profiles query failed",
        profilesError,
      );
      return;
    }

    // 3. Send a welcome message to each member who has a registered CPF
    for (const profile of profiles ?? []) {
      const externalId = profile.employee_internal_id as string | null;
      if (!externalId) continue;

      const firstName = (
        (profile.full_name as string | null) ?? "Colaborador"
      ).split(" ")[0];
      const text = buildProjectWelcomeMessage({
        firstName,
        projectName,
        projectDescription,
      });

      await sendHumandMessage(externalId, text);
    }
  } catch (err) {
    console.error("notifyProjectTeamMembers error:", err);
  }
}

// ---------------------------------------------------------------------------
// Project status change notifications (on-hold / reactivation)
// ---------------------------------------------------------------------------

/**
 * Shared helper: resolves all unique user profiles for the teams linked to a
 * project. Used by the on-hold and reactivation notifiers below.
 */
async function getProjectMemberProfiles(projectId: string) {
  // Step 1 — find which teams are linked to the project
  const { data: projectTeams, error: ptError } = await supabase
    .from("project_teams")
    .select("team_id")
    .eq("project_id", projectId);

  if (ptError) {
    console.error("[humandService] project_teams query failed:", ptError);
    return [];
  }
  if (!projectTeams?.length) {
    console.warn("[humandService] No teams found for project:", projectId);
    return [];
  }

  const teamIds = projectTeams.map((pt) => pt.team_id as string);

  // Step 2 — find all members of those teams
  const { data: memberships, error: tmError } = await supabase
    .from("team_members")
    .select("user_id")
    .in("team_id", teamIds);

  if (tmError) {
    console.error("[humandService] team_members query failed:", tmError);
    return [];
  }
  if (!memberships?.length) {
    console.warn("[humandService] No members found for teams:", teamIds);
    return [];
  }

  const uniqueUserIds = [
    ...new Set(memberships.map((m) => m.user_id as string)),
  ];

  // Step 3 — fetch their profiles (name + Humand external ID)
  const { data: profiles, error: profError } = await supabase
    .from("profiles")
    .select("full_name, employee_internal_id")
    .in("id", uniqueUserIds);

  if (profError) {
    console.error("[humandService] profiles query failed:", profError);
    return [];
  }

  const withId = (profiles ?? []).filter((p) => p.employee_internal_id);
  if (!withId.length) {
    console.warn(
      "[humandService] No profiles with employee_internal_id found. Users:",
      uniqueUserIds,
    );
  }

  return profiles ?? [];
}

export function buildProjectOnHoldMessage({
  firstName,
  projectName,
  reason,
}: {
  firstName: string;
  projectName: string;
  reason: string;
}): string {
  return (
    `Oi, ${firstName}! ⏸️\n\n` +
    `Preciso te comunicar que o projeto *${projectName}* entrou em período de espera.\n\n` +
    `Motivo registrado:\n"${reason}"\n\n` +
    `Assim que o projeto retomar, estarei aqui com você para continuarmos essa jornada! ` +
    `Pode contar comigo. 💙\n\n`
  );
}

export function buildProjectReactivatedMessage({
  firstName,
  projectName,
}: {
  firstName: string;
  projectName: string;
}): string {
  return (
    `Oi, ${firstName}! 🎉\n\n` +
    `Ótima notícia — o projeto *${projectName}* voltou a estar ativo! 🚀\n\n` +
    `Estou animada para retomar essa jornada com você! ` +
    `Estarei aqui em cada etapa para ajudar a alcançar todos os objetivos. Vamos nessa! 💪❤️‍🩹\n\n` +
    `— Ada, sua assistente no Daher Plan`
  );
}

/** Notifies all project team members that the project was set to "Em Espera". Fire-and-forget. */
export async function notifyProjectOnHold({
  projectId,
  projectName,
  reason,
}: {
  projectId: string;
  projectName: string;
  reason: string;
}): Promise<void> {
  try {
    const profiles = await getProjectMemberProfiles(projectId);
    for (const profile of profiles) {
      const externalId = profile.employee_internal_id as string | null;
      if (!externalId) continue;
      const firstName = (
        (profile.full_name as string | null) ?? "Colaborador"
      ).split(" ")[0];
      await sendHumandMessage(
        externalId,
        buildProjectOnHoldMessage({ firstName, projectName, reason }),
      );
    }
  } catch (err) {
    console.error("notifyProjectOnHold error:", err);
  }
}

/** Notifies all project team members that the project was reactivated. Fire-and-forget. */
export async function notifyProjectReactivated({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}): Promise<void> {
  try {
    const profiles = await getProjectMemberProfiles(projectId);
    for (const profile of profiles) {
      const externalId = profile.employee_internal_id as string | null;
      if (!externalId) continue;
      const firstName = (
        (profile.full_name as string | null) ?? "Colaborador"
      ).split(" ")[0];
      await sendHumandMessage(
        externalId,
        buildProjectReactivatedMessage({ firstName, projectName }),
      );
    }
  } catch (err) {
    console.error("notifyProjectReactivated error:", err);
  }
}

// ---------------------------------------------------------------------------
// Centennial milestone: acknowledgement + broadcast (multiples of 100 tasks)
// ---------------------------------------------------------------------------

/**
 * Sends a Humand acknowledgement (recognition post on the Humand platform) for
 * a user who reached a multiple-of-100 task milestone.
 *
 * The `acknowledgedUsername` is the user's employee_internal_id (CPF), which
 * is the identifier used across the Humand integration.
 */
export async function sendHumandAcknowledgement({
  acknowledgedUsername,
  body,
}: {
  acknowledgedUsername: string;
  body: string;
}): Promise<boolean> {
  if (!HUMAND_ACK_API_URL) {
    console.info(
      "[dev] Humand acknowledgement skipped (no proxy URL configured):",
      body.slice(0, 80),
    );
    return true;
  }

  const response = await fetch(HUMAND_ACK_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acknowledgedUsername, body }),
  });

  if (!response.ok) {
    console.error(
      "humandService: acknowledgement proxy returned",
      response.status,
    );
    return false;
  }

  const data = await response.json();
  return data.success === true;
}

/**
 * Text that appears as the acknowledgement body on the Humand platform.
 * Gender-neutral — avoids gendered suffixes in Brazilian Portuguese.
 */
export function buildCentennialAcknowledgementBody(
  userName: string,
  milestone: number,
): string {
  return (
    `Parabéns para ${userName}! 🏆\n\n` +
    `Pessoa de muito talento e dedicação que acabou de completar ${milestone} atividades ` +
    `no DaherPlan, nosso sistema de gestão de projetos.\n\n` +
    `Uma conquista que inspira toda a equipe e demonstra um comprometimento ` +
    `exemplar com a entrega de projetos de saúde com qualidade e eficiência. 🚀❤️‍🩹`
  );
}

/**
 * Message sent via Humand chat to every user in the platform, announcing the
 * recognition and directing them to celebrate on the Humand acknowledgements page.
 * Gender-neutral — avoids gendered suffixes in Brazilian Portuguese.
 */
export function buildCentennialBroadcastMessage(
  userName: string,
  milestone: number,
): string {
  return (
    `🏆 *Reconhecimento no DaherPlan!*\n\n` +
    `${userName} acabou de completar *${milestone} atividades* no nosso sistema de ` +
    `gestão de projetos e recebeu um Reconhecimento na Humand! 🎉\n\n` +
    `Que tal celebrar esse momento e deixar uma mensagem de parabéns?\n\n` +
    `Acesse: https://app.humand.co/acknowledgements`
  );
}

/**
 * Orchestrates the full centennial milestone flow:
 *  1. Posts a Humand acknowledgement for the person who reached the milestone.
 *  2. Sends a Humand chat message to ALL users in the profiles table, encouraging
 *     them to visit https://app.humand.co/acknowledgements and celebrate.
 *
 * Fire-and-forget — never throws so it never blocks the task status update.
 */
export async function notifyAllUsersOfCentennialMilestone({
  userId,
  userName,
  employeeInternalId,
  milestone,
}: {
  userId: string;
  userName: string;
  employeeInternalId: string | null;
  milestone: number;
}): Promise<void> {
  try {
    // 1. Post the acknowledgement on the Humand platform for the honoured person
    if (employeeInternalId) {
      await sendHumandAcknowledgement({
        acknowledgedUsername: employeeInternalId,
        body: buildCentennialAcknowledgementBody(userName, milestone),
      });
    }

    // 2. Broadcast to every registered user in the SaaS
    const { data: allProfiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, employee_internal_id");

    if (error) {
      console.error(
        "[humandService] centennial broadcast: profiles query failed",
        error,
      );
      return;
    }

    const broadcastText = buildCentennialBroadcastMessage(userName, milestone);

    for (const profile of allProfiles ?? []) {
      // Skip the honoured person themselves (they get the direct Humand message
      // from the existing milestone flow, not a "go check the page" nudge)
      if (profile.id === userId) continue;

      const externalId = profile.employee_internal_id as string | null;
      if (!externalId) continue;

      await sendHumandMessage(externalId, broadcastText);
    }
  } catch (err) {
    console.error("notifyAllUsersOfCentennialMilestone error:", err);
  }
}
