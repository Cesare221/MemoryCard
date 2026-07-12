import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function createStubClient() {
  const stub = {
    auth: {
      signUp: async () => ({ data: null, error: new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env') }),
      signInWithPassword: async () => ({ data: null, error: new Error('Supabase não configurado.') }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: new Error('Supabase não configurado.') }),
      updateUser: async () => ({ error: new Error('Supabase não configurado.') }),
      refreshSession: async () => ({ data: null, error: new Error('Supabase não configurado.') }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ order: async () => ({ data: null, error: new Error('Supabase não configurado.') }) }) }),
      insert: async () => ({ error: new Error('Supabase não configurado.') }),
      update: () => ({ eq: () => ({ eq: () => ({ error: new Error('Supabase não configurado.') }) }) }),
      delete: () => ({ eq: () => ({ error: new Error('Supabase não configurado.') }) }),
    }),
  }
  return stub
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : createStubClient()
