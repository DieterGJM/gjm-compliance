import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || 'https://kvphvvjvmkkxkolaxeux.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cGh2dmp2bWtreGtvbGF4ZXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDQ0NzAsImV4cCI6MjA5Nzc4MDQ3MH0.QSEGqQHeoVBM0s94cWAvoMXUsrMru5nIN-zcFfhXa4Q'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
