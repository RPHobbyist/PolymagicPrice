/** Terminal states every driver reports only when a print actually completed. */
const DONE_STATES = ['FINISH', 'FINISHED', 'complete', 'completed'];
/** Idle-like states a printer also reports after a cancelled or failed print. */
const IDLE_STATES = ['Operational', 'READY', 'IDLE', 'idle', 'standby'];

/**
 * True when a RUNNING printer has just finished a print. An idle state alone is not enough: a
 * cancelled or failed print ends in IDLE too, so those only count when progress reached the end.
 */
export function isPrintFinished(
    prevState: string | undefined,
    state: string,
    progress: number | undefined,
    prevProgress: number | undefined
): boolean {
    if (prevState !== 'RUNNING') return false;
    if (DONE_STATES.includes(state)) return true;
    if (!IDLE_STATES.includes(state)) return false;
    return Math.max(progress ?? 0, prevProgress ?? 0) >= 99;
}
