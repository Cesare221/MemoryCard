import { supabase } from '../lib/supabaseClient.js'

const SESSION_KEY = 'memory-depo-session-v1'
const MIGRATED_KEY = 'memory-depo-migrated-v1'

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function persistSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {}
}

const SESSION_KEYS = ['id', 'email', 'name', 'accessToken', 'refreshToken']

function toSerializable(session) {
  if (!session) return null
  const obj = {}
  for (const key of SESSION_KEYS) {
    if (session[key] !== undefined) obj[key] = session[key]
  }
  return obj
}

function fromSupabaseSession(sbSession) {
  if (!sbSession?.user) return null
  return {
    id: sbSession.user.id,
    email: sbSession.user.email || '',
    name: sbSession.user.user_metadata?.name || sbSession.user.email?.split('@')[0] || '',
    accessToken: sbSession.access_token,
    refreshToken: sbSession.refresh_token,
  }
}

export async function signUp({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: name?.trim() || email.split('@')[0] },
      emailRedirectTo: `${window.location.origin}/`,
    },
  })

  if (error) throw new Error(error.message)

  if (data?.user?.identities?.length === 0) {
    throw new Error('Já existe uma conta para este e-mail.')
  }

  if (data?.session) {
    const session = fromSupabaseSession(data.session)
    persistSession(toSerializable(session))
    return { session, emailConfirmed: true }
  }

  return { session: null, emailConfirmed: false }
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw new Error(error.message)

  const session = fromSupabaseSession(data.session)
  persistSession(toSerializable(session))
  return { session, emailConfirmed: true }
}

export async function signOut() {
  clearSession()
  const { error } = await supabase.auth.signOut()
  if (error) console.warn('Supabase signOut error:', error.message)
}

export async function sendPasswordReset({ email }) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  })

  if (error) throw new Error(error.message)
}

export async function updatePassword({ password }) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.session) {
    clearSession()
    return null
  }
  const session = fromSupabaseSession(data.session)
  persistSession(toSerializable(session))
  return session
}

export function tryRestoreSession() {
  return getStoredSession()
}

export function isMigrationDone(userId) {
  try {
    return localStorage.getItem(`${MIGRATED_KEY}:${userId}`) === 'true'
  } catch {
    return false
  }
}

export function markMigrationDone(userId) {
  try {
    localStorage.setItem(`${MIGRATED_KEY}:${userId}`, 'true')
  } catch {}
}

export function detectLegacyItems() {
  try {
    const raw = localStorage.getItem('memory-depo-v2')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function clearLegacyStorage() {
  try {
    localStorage.removeItem('memory-depo-v2')
  } catch {}
}
