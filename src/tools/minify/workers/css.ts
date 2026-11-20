import { minifyCss } from '../css'
import { serve } from './serve'

serve((job) => minifyCss(job.code))
