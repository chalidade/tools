import { beautifyCode } from '../beautify'
import { serve } from './serve'

serve((job) => beautifyCode(job.lang, job.code, job.indent))
