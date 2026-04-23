/**
 * humandService
 *
 * Single-responsibility service for:
 *   - Building milestone congratulation messages
 *   - Sending messages through the Humand API proxy
 *
 * No React dependencies — pure functions, easy to test and reuse.
 */

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
    `Oiê!! Parabéns, ${firstName}! 🎉 \n` +
    `Você concluiu ${milestone} tarefas no Daher Plan!`;

  if (isFaster) {
    const current = formatDuration(batchDurationMs!);
    const previous = formatDuration(previousBatchDurationMs!);
    return (
      `${header}\n\n` +
      `E mais: você está cada vez mais veloz!\n` +
      `  • Bloco anterior de 10 tarefas realizadas foi feito no prazo de: ${previous}\n` +
      `  • Bloco atual:    ${current} 🚀 \n\n` +
      `Continue assim — cada tarefa concluída aproxima o time da realização deste projeto! 💪\n\n\n\n` +
      `Obs.: Esta mensagem foi enviada pela assistente Ada (Daher Plan). ` +
      `Não é possível responder à Ada por este canal — para continuar, acesse o Daher Plan.`
    );
  }

  return (
    `${header}\n\n` +
    `Continue com o ótimo trabalho! A equipe conta com você. 🌟\n\n` +
    `Obs.: Esta mensagem foi enviada pela assistente Ada (Daher Plan). ` +
    `Não é possível responder à Ada por este canal — para continuar, acesse o Daher Plan.`
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
