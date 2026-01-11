
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please check your .env file.')
}

const authOptions = {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
}

if (typeof window !== 'undefined' && window.localStorage) {
    authOptions.storage = window.localStorage
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: authOptions,
})
