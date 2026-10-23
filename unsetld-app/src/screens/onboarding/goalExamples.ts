// The Goal step's example chips. Kept apart from the screen so it can be tested.
import type { SafetyResult } from '../../core/safety';

/**
 * The examples under the goal ("Get my GPA up", "Build muscle" ...) show except under the support
 * line: there the screen gives where to get help, and nothing else (copy/safety).
 */
export function showsGoalExamples(flagged: Pick<SafetyResult, 'level'> | null): boolean {
  return flagged?.level !== 'support';
}
