import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnbgdrudwdutjmlxbudf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuYmdkcnVkd2R1dGptbHhidWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzY4MDYsImV4cCI6MjA5NTUxMjgwNn0.FJakX7-x2JMzs89lqYUsEUGzzXasQclMynuHZIEM7Z0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
