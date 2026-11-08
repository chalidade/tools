/** Morse timing: dot = 1 unit, dash = 3, gap inside a letter 1, between letters 3, between words 7. */
export interface Step {
  on: boolean
  units: number
}

const S = '...'
const O = '---'

/** One full "SOS" cycle (S O S) followed by a word gap, as alternating on/off steps. */
export function sosSteps(): Step[] {
  const steps: Step[] = []
  const letters = [S, O, S]
  letters.forEach((letter, li) => {
    ;[...letter].forEach((sym, si) => {
      steps.push({ on: true, units: sym === '.' ? 1 : 3 })
      if (si < letter.length - 1) steps.push({ on: false, units: 1 })
    })
    steps.push({ on: false, units: li < letters.length - 1 ? 3 : 7 })
  })
  return steps
}

export const totalUnits = (steps: Step[]) => steps.reduce((a, s) => a + s.units, 0)
