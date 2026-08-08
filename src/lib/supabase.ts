import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Quando não configurado, o App mostra instruções em vez das telas.
export const supabaseConfigurado = Boolean(url && chave)

export const supabase = createClient(
  url ?? 'https://nao-configurado.supabase.co',
  chave ?? 'nao-configurado'
)
