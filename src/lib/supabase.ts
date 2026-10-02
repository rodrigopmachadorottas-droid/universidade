import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const configurado = Boolean(url && key)
export const supabase = createClient(url || 'https://exemplo.supabase.co', key || 'chave-ausente', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const DOMINIO = 'rottasconstrutora.com.br'
