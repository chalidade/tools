import { CodeError, type Lang, type Mode } from '../errors'

export interface MinifyJob {
  lang: Lang
  mode: Mode
  code: string
  indent: number
}
export type MinifyReply = { out: string } | { error: string; line?: number; col?: number }

/** Answers each job posted to this worker with `work`'s result or its error. */
export function serve(work: (job: MinifyJob) => string | Promise<string>) {
  self.onmessage = async (e: MessageEvent<MinifyJob>) => {
    try {
      self.postMessage({ out: await work(e.data) } satisfies MinifyReply)
    } catch (err) {
      if (err instanceof CodeError) self.postMessage({ error: err.message, line: err.line, col: err.col } satisfies MinifyReply)
      else self.postMessage({ error: err instanceof Error ? err.message : String(err) } satisfies MinifyReply)
    }
  }
}
