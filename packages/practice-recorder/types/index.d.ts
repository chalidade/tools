// Public types of @chalidade/practice-recorder. They mirror src/tools/metronome/click.ts;
// types/check.ts fails the build if they drift.

/**
 * Schedules one metronome click at `when` (AudioContext time) on `ctx.destination`:
 * a 50 ms sine blip at 1760 Hz for an accent, 1100 Hz for a beat, and a softer
 * 800 Hz for a subdivision.
 */
export declare function click(ctx: AudioContext, when: number, kind: 'accent' | 'beat' | 'sub'): void
