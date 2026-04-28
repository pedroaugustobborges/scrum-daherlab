/**
 * useTaskMilestone
 *
 * Gamification hook: sends a Humand congratulation when the current user
 * reaches a multiple-of-10 task completion milestone.
 *
 * Calling convention:
 *   const { checkAndNotifyMilestone } = useTaskMilestone()
 *   void checkAndNotifyMilestone(userId)   // fire-and-forget after any task → done
 *
 * Design:
 *   On every call the hook finds the HIGHEST uncelebrated milestone ≤ the
 *   user's total done-task count. This means it is self-healing: if a
 *   milestone was skipped (e.g. the feature wasn't deployed yet), the NEXT
 *   task completion will catch it automatically — no login, no page refresh.
 *
 *   All lower uncelebrated milestones are silently recorded; only the highest
 *   one gets a Humand message (avoids notification spam on first run).
 */

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  buildMilestoneMessage,
  sendHumandMessage,
} from '@/services/humandService';

const MILESTONE_INTERVAL = 10;

// ---------------------------------------------------------------------------
// In-flight guard — module-level so it is shared across every mounted view.
// JS is single-threaded: has() + add() is an atomic check-and-set, so this
// reliably prevents concurrent calls (Grid + Kanban + Planner all mounted)
// from each running the full flow before the DB insert completes.
// ---------------------------------------------------------------------------
const inFlight = new Set<string>();

// ---------------------------------------------------------------------------
// Module-private helpers (pure)
// ---------------------------------------------------------------------------

type TaskRow = { completed_at: string | null; updated_at: string | null };

const bestTimestamp = (row: TaskRow) => row.completed_at ?? row.updated_at;

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
   * Call right after a task is persisted as "done".
   *
   * Algorithm:
   *  1. Count all done tasks assigned to the user.
   *  2. Compute the highest milestone ≤ count (floor to nearest 10).
   *  3. If that milestone is already recorded → nothing to do.
   *  4. Otherwise find ALL uncelebrated milestones up to that point.
   *  5. Silently insert every lower missing milestone (no message).
   *  6. Fetch timing data and send Humand message for the highest one.
   *  7. Persist the highest milestone record.
   */
  const checkAndNotifyMilestone = useCallback(async (userId: string): Promise<void> => {
    // Skip if another call for this user is already in progress
    if (inFlight.has(userId)) return;
    inFlight.add(userId);
    try {
      // ── 1. Count done tasks ───────────────────────────────────────────────
      const { count, error: countError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .eq('status', 'done');

      if (countError || !count || count < MILESTONE_INTERVAL) return;

      // ── 2. Highest milestone the user has reached ─────────────────────────
      const highest = Math.floor(count / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;

      // ── 3. Fast-path: is the highest already celebrated? ─────────────────
      const { data: topRecord } = await supabase
        .from('user_task_milestones')
        .select('id')
        .eq('user_id', userId)
        .eq('milestone', highest)
        .maybeSingle();

      if (topRecord) return;

      // ── 4. Find every uncelebrated milestone up to `highest` ─────────────
      const expected: number[] = [];
      for (let m = MILESTONE_INTERVAL; m <= highest; m += MILESTONE_INTERVAL) {
        expected.push(m);
      }

      const { data: existing } = await supabase
        .from('user_task_milestones')
        .select('milestone')
        .eq('user_id', userId)
        .in('milestone', expected);

      const recorded  = new Set((existing ?? []).map((r) => r.milestone));
      const missing   = expected.filter((m) => !recorded.has(m));

      if (missing.length === 0) return;

      // ── 5. Silently record all lower missing milestones (no Humand msg) ───
      const lowerMissing = missing.filter((m) => m < highest);
      if (lowerMissing.length > 0) {
        await supabase
          .from('user_task_milestones')
          .insert(lowerMissing.map((m) => ({ user_id: userId, milestone: m })));
      }

      // ── 6. Timing data ────────────────────────────────────────────────────
      const { data: recentTasks } = await supabase
        .from('tasks')
        .select('completed_at, updated_at')
        .eq('assigned_to', userId)
        .eq('status', 'done')
        .order('completed_at', { ascending: false, nullsFirst: false })
        .limit(MILESTONE_INTERVAL * 2);

      const rows         = (recentTasks ?? []) as TaskRow[];
      const currentBatch = rows.slice(0, MILESTONE_INTERVAL);
      const prevBatch    = rows.slice(MILESTONE_INTERVAL, MILESTONE_INTERVAL * 2);

      const batchDurationMs     = batchDuration(currentBatch.map(bestTimestamp));
      const prevBatchDurationMs = prevBatch.length === MILESTONE_INTERVAL
        ? batchDuration(prevBatch.map(bestTimestamp))
        : null;

      // ── 7. Fetch profile ──────────────────────────────────────────────────
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, employee_internal_id')
        .eq('id', userId)
        .single();

      // ── 8. Send Humand message ────────────────────────────────────────────
      const text = buildMilestoneMessage({
        milestone:              highest,
        userName:               profile?.full_name ?? 'Colaborador',
        batchDurationMs,
        previousBatchDurationMs: prevBatchDurationMs,
      });

      const externalId = profile?.employee_internal_id ?? null;
      if (externalId) {
        await sendHumandMessage(externalId, text);
      }

      // ── 9. Persist the highest milestone (idempotency guard) ─────────────
      await supabase.from('user_task_milestones').insert({
        user_id:                    userId,
        milestone:                  highest,
        batch_duration_ms:          batchDurationMs,
        previous_batch_duration_ms: prevBatchDurationMs,
      });
    } catch (err) {
      console.error('useTaskMilestone error:', err);
    } finally {
      inFlight.delete(userId);
    }
  }, []);

  return { checkAndNotifyMilestone };
}
