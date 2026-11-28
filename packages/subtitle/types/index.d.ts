/** One subtitle line: times in seconds. */
export interface Cue {
  start: number
  end: number
  text: string
}

export type SubFormat = 'srt' | 'vtt'

/** Reads SRT or VTT text into cues (the format is detected). */
export declare function parseSubtitle(input: string): Cue[]
/** A time in seconds as an SRT (00:00:01,500) or VTT (00:00:01.500) timestamp. */
export declare function formatTime(sec: number, format: SubFormat): string
/** Writes cues as an SRT or VTT file. */
export declare function writeSubtitle(cues: Cue[], format: SubFormat): string
/** Moves every cue by `by` seconds (negative = earlier). */
export declare function shiftCues(cues: Cue[], by: number): Cue[]
/** Multiplies every time by `factor` (for frame-rate changes). */
export declare function stretchCues(cues: Cue[], factor: number): Cue[]
/** Appends `second` after `first`, its times moved by `offset` seconds. */
export declare function mergeCues(first: Cue[], second: Cue[], offset: number): Cue[]
