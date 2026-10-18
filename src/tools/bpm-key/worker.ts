// Runs the analysis off the main thread so the page stays responsive.
import { analyze } from './analyze'

self.onmessage = (e: MessageEvent<Float32Array>) => {
  self.postMessage(analyze(e.data))
}
