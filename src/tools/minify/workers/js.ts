import { minifyJs } from '../js'
import { serve } from './serve'

serve((job) => minifyJs(job.code))
