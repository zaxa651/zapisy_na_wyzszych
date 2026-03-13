import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ogzdbeddikbhdzkvsqsy.supabase.co"
const supabaseKey = "sb_publishable_BnHjypNqANG6UsT-64x8vw_tJEOXah4"

export const supabase = createClient(supabaseUrl, supabaseKey)

