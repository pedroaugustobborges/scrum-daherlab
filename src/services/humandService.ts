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
