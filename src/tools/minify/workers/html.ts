import { minifyHtml } from '../html'
import { serve } from './serve'

serve((job) => minifyHtml(job.code))
