// Public types of @chalidade/calculator. They mirror src/tools/calculator/engine.ts;
// types/check.ts fails the build if they drift.

export type AngleMode = 'deg' | 'rad'

/** Thrown by evaluate() for input it can't compute; the message is in the UI language. */
export declare class CalcError extends Error {}

/**
 * Evaluates an expression with a tokenizer and recursive-descent parser (never
 * eval). Accepts + - * / ^ ! %, × ÷ −, brackets, a comma or dot as the decimal
 * point, implicit multiplication (2π, 3(4+5)), the constants π / pi / e, `ans`,
 * and sin cos tan asin acos atan ln log abs sqrt cbrt √ ∛. Percent follows
 * phone calculators: 200 + 10% = 220. Trig uses degrees unless angle is 'rad'.
 * Throws CalcError for anything else, and for results that are NaN or infinite.
 */
export declare function evaluate(input: string, opts?: { angle?: AngleMode; ans?: number }): number
/** Rounds binary noise away by keeping 12 significant digits (0.1 + 0.2 → 0.3). */
export declare function clean(n: number): number
/** "," in Indonesian, "." in English (the UI language). */
export declare const decimalPoint: () => '.' | ','
/** Grouped for display in the UI language ("1,234.5" / "1.234,5"); exponent notation for huge or tiny values. */
export declare function formatNumber(n: number): string
/** Ungrouped, with the UI language's decimal point: text evaluate() reads back. */
export declare function plainNumber(n: number): string
