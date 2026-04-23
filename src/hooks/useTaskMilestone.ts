/**
 * useTaskMilestone
 *
 * Gamification hook: detects when the current user reaches a multiple-of-10
 * task completion milestone and sends a congratulation via Humand.
 *
 * Calling convention:
 *   const { checkAndNotifyMilestone } = useTaskMilestone()
 *   // After marking a task done:
 *   void checkAndNotifyMilestone(userId)
 *
 * The call is fire-and-forget — it never blocks the UI.
 */

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  buildMilestoneMessage,
  sendHumandMessage,
} from '@/services/humandService';

const MILESTONE_INTERVAL = 10;

// ---------------------------------------------------------------------------
// Helpers (pure, not exported — keep the public surface small)
// ---------------------------------------------------------------------------

/** Returns the duration in ms between the oldest and newest timestamp in a set. */
function batchDuration(timestamps: (string | null)[]): number | null {
  const valid = timestamps
    .filter(Boolean)
    .map((t) => new Date(t!).getTime())
    .filter((n) => !isNaN(n));

  if (valid.length < 2) return null;

  return Math.max(...valid) - Math.min(...valid);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTaskMilestone() {
  /**
   * Main entry point. Call right after a task is persisted as "done".
   *
   * Steps:
   *  1. Count all tasks assigned to the user that are "done".
   *  2. If the count is a multiple of MILESTONE_INTERVAL, check whether
   *     we have already notified for this milestone (idempotency).
   *  3. Fetch the last 2 × MILESTONE_INTERVAL completed tasks for timing.
   *  4. Build message, send via Humand, then persist the milestone record.
   */
  const checkAndNotifyMilestone = useCallback(async (userId: string): Promise<void> => {
    try {
      // ── 1. Count done tasks ───────────────────────────────────────────────
      const { count, error: countError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .eq('status', 'done');

      if (countError || count === null) return;
      if (count === 0 || count % MILESTONE_INTERVAL !== 0) return;

      const milestone = count;

      // ── 2. Idempotency check ──────────────────────────────────────────────
      const { data: existing } = await supabase
        .from('user_task_milestones')
        .select('id')
        .eq('user_id', userId)
        .eq('milestone', milestone)
        .maybeSingle();

      if (existing) return; // already notified

      // ── 3. Fetch user profile (name + Humand external ID) ─────────────────
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, employee_internal_id')
        .eq('id', userId)
        .single();

      // ── 4. Timing: fetch last 2×N tasks by completion date ────────────────
      const { data: recentTasks } = await supabase
        .from('tasks')
        .select('completed_at, updated_at')
        .eq('assigned_to', userId)
        .eq('status', 'done')
        .order('completed_at', { ascending: false, nullsFirst: false })
        .limit(MILESTONE_INTERVAL * 2);

      const getTimestamp = (row: { completed_at: string | null; updated_at: string | null }) =>
        row.completed_at ?? row.updated_at;

      const currentBatch  = (recentTasks ?? []).slice(0, MILESTONE_INTERVAL);
      const previousBatch = (recentTasks ?? []).slice(MILESTONE_INTERVAL, MILESTONE_INTERVAL * 2);

      const batchDurationMs         = batchDuration(currentBatch.map(getTimestamp));
      const previousBatchDurationMs = previousBatch.length === MILESTONE_INTERVAL
        ? batchDuration(previousBatch.map(getTimestamp))
        : null;

      // ── 5. Send Humand message ────────────────────────────────────────────
      const userName = profile?.full_name ?? 'Colaborador';
      const text = buildMilestoneMessage({
        milestone,
        userName,
        batchDurationMs,
        previousBatchDurationMs,
      });

      const externalId = profile?.employee_internal_id ?? null;
      if (externalId) {
        await sendHumandMessage(externalId, text);
      }

      // ── 6. Persist milestone record (prevents re-notification) ───────────
      await supabase.from('user_task_milestones').insert({
        user_id:                   userId,
        milestone,
        batch_duration_ms:         batchDurationMs,
        previous_batch_duration_ms: previousBatchDurationMs,
      });
    } catch (err) {
      // Never let gamification errors surface to the user
      console.error('useTaskMilestone error:', err);
    }
  }, []);

  return { checkAndNotifyMilestone };
}
