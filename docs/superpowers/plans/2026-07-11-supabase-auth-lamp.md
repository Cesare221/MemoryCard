# Supabase Auth and Lamp Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser-only accounts and persistence with managed Supabase authentication and per-user storage, while delivering the approved responsive Lamp login interaction.

**Architecture:** A lazy singleton Supabase client feeds a focused authentication provider and a focused memory repository. `App.jsx` remains the composition root: it gates private content on the restored session, loads remote memories before enabling mutations, and offers one-time legacy import. SQL migrations enforce ownership independently through Postgres Row Level Security.

**Tech Stack:** React 19, Vite 5, `@supabase/supabase-js` 2.110.2, Supabase Auth, Postgres/RLS, Vitest 4.1.10, Testing Library React 16.3.2, Testing Library DOM matchers 6.9.1, Testing Library user-event 14.6.1, jsdom 29.1.1.

## Global Constraints

- Use managed Supabase; do not add MongoDB, a custom API server, or a self-hosted Docker runtime.
- Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as the only browser-side Supabase configuration values.
- Never expose `service_role`, store plaintext passwords, or fall back silently to local authentication or local persistence.
- Keep email/password signup public and require email confirmation before the first authenticated session.
- Include login, logout, password-reset request, and new-password completion.
- Apply `auth.uid() = user_id` ownership to `SELECT`, `INSERT`, `UPDATE`, and `DELETE` through RLS.
- Preserve the four memory types exactly: `note`, `idea`, `link`, and `snippet`.
- Preserve search, filters, pinning, editing, copying, JSON import, and JSON export.
- Keep the legacy `memory-depo-v2` payload unchanged after a successful migration; record completion per authenticated user.
- Keep the login form hidden, unfocusable, and pointer-inert until the lamp is switched on.
- Support cord drag with Pointer Events plus click, `Enter`, and `Space`; do not add GSAP, remote audio, or CDN scripts.
- At widths up to and including `720px`, stack the compact lamp above the form and permit vertical scrolling.
- Respect `prefers-reduced-motion` without removing any behavior.
- Preserve unrelated user changes already present in `README.md`, `src/App.jsx`, `src/styles.css`, `src/components/`, `src/services/`, `tmp-login-form/`, and `Login-Form-Lamp.zip`.

## File Structure

- `.env.example` — documents public Supabase variables without credentials.
- `vite.config.js` — keeps React build configuration and adds Vitest/jsdom settings.
- `src/test/setup.js` — installs DOM matchers and cleanup for every test.
- `src/lib/supabase.js` — validates environment configuration and owns the lazy client singleton.
- `src/auth/authApi.js` — wraps Supabase Auth operations and translates known errors.
- `src/auth/AuthContext.jsx` — restores and observes the session, exposing auth commands and state.
- `src/auth/authApi.test.js` and `src/auth/AuthContext.test.jsx` — unit tests for auth commands and session transitions.
- `src/memories/memoryModel.js` — validates and maps UI memories to database rows.
- `src/memories/memoryRepository.js` — performs individual Supabase CRUD operations.
- `src/memories/legacyMigration.js` — detects and imports `memory-depo-v2` idempotently.
- `src/memories/*.test.js` — unit tests for mapping, CRUD, and migration behavior.
- `src/components/Lamp.jsx` — accessible Pointer Events lamp control.
- `src/components/LoginScreen.jsx` — auth mode forms and lamp-gated visibility.
- `src/components/Lamp.test.jsx` and `src/components/LoginScreen.test.jsx` — interaction and auth-screen tests.
- `src/App.jsx` — authenticated composition, remote loading, CRUD wiring, and migration prompt.
- `src/App.test.jsx` — integration tests using mocked auth and memory boundaries.
- `src/main.jsx` — mounts `AuthProvider` around `App`.
- `src/styles.css` — approved desktop/mobile Lamp design, states, and reduced-motion rules.
- `supabase/migrations/202607110001_create_memory_items.sql` — table, indexes, trigger, grants, and RLS policies.
- `README.md` — setup, Supabase dashboard, redirects, SMTP, migration, tests, and Vercel instructions.

---

### Task 1: Test Harness and Supabase Client Boundary

**Files:**
- Modify: `package.json:6-18`
- Modify: `vite.config.js:1-8`
- Create: `.env.example`
- Create: `src/test/setup.js`
- Create: `src/lib/supabase.js`
- Test: `src/lib/supabase.test.js`

**Interfaces:**
- Consumes: Vite `import.meta.env` values `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Produces: `readSupabaseConfig(env) -> { url, anonKey }` and `getSupabaseClient() -> SupabaseClient`.

- [ ] **Step 1: Install runtime and test dependencies**

Run:

```powershell
npm install @supabase/supabase-js@2.110.2
npm install --save-dev vitest@4.1.10 @testing-library/react@16.3.2 @testing-library/jest-dom@6.9.1 @testing-library/user-event@14.6.1 jsdom@29.1.1
```

Expected: both commands exit `0`; `package.json` and `package-lock.json` contain the pinned package versions.

- [ ] **Step 2: Add the test scripts and jsdom setup**

Set the scripts in `package.json` to include:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Replace `vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    restoreMocks: true,
  },
})
```

Create `src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
```

- [ ] **Step 3: Write failing configuration tests**

Create `src/lib/supabase.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { readSupabaseConfig } from './supabase.js'

describe('readSupabaseConfig', () => {
  it('returns the public Supabase values', () => {
    expect(readSupabaseConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
    })).toEqual({
      url: 'https://project.supabase.co',
      anonKey: 'sb_publishable_test',
    })
  })

  it('throws a clear error when either value is missing', () => {
    expect(() => readSupabaseConfig({ VITE_SUPABASE_URL: '' }))
      .toThrow('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
  })
})
```

- [ ] **Step 4: Run the test and verify the missing module failure**

Run: `npm test -- src/lib/supabase.test.js`

Expected: FAIL because `src/lib/supabase.js` does not exist.

- [ ] **Step 5: Implement the lazy Supabase client**

Create `src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'

let client

export function readSupabaseConfig(env = import.meta.env) {
  const url = env?.VITE_SUPABASE_URL?.trim()
  const anonKey = env?.VITE_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
  }

  return { url, anonKey }
}

export function getSupabaseClient() {
  if (!client) {
    const { url, anonKey } = readSupabaseConfig()
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return client
}
```

Create `.env.example`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
```

- [ ] **Step 6: Run the focused test**

Run: `npm test -- src/lib/supabase.test.js`

Expected: PASS with `2 passed`.

- [ ] **Step 7: Commit the client boundary**

```powershell
git add package.json package-lock.json vite.config.js .env.example src/test/setup.js src/lib/supabase.js src/lib/supabase.test.js
git commit -m "test: add Supabase client boundary"
```

---

### Task 2: Database Migration and Memory Repository

**Files:**
- Create: `supabase/migrations/202607110001_create_memory_items.sql`
- Create: `src/memories/memoryModel.js`
- Create: `src/memories/memoryModel.test.js`
- Create: `src/memories/memoryRepository.js`
- Test: `src/memories/memoryRepository.test.js`

**Interfaces:**
- Consumes: `getSupabaseClient()` from Task 1 and UI memory objects `{ id, type, content, url, tags, pinned, createdAt, updatedAt }`.
- Produces: `normalizeMemory`, `fromMemoryRow`, `toMemoryRow`, `listMemories`, `createMemory`, `updateMemory`, `deleteMemory`, and `importMemories`.

- [ ] **Step 1: Write failing model tests**

Create `src/memories/memoryModel.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { fromMemoryRow, normalizeMemory, toMemoryRow } from './memoryModel.js'

const memory = {
  id: 'b7e89a26-9de3-4a7b-95d2-0049507139c0',
  type: 'idea',
  content: 'Criar um catálogo',
  url: '',
  tags: ['produto'],
  pinned: true,
  createdAt: 1710000000000,
  updatedAt: 1710000300000,
}

it('maps an interface memory to a Supabase row owned by the user', () => {
  expect(toMemoryRow(memory, 'user-1')).toEqual({
    id: memory.id,
    user_id: 'user-1',
    type: 'idea',
    content: 'Criar um catálogo',
    url: '',
    tags: ['produto'],
    pinned: true,
    created_at: new Date(1710000000000).toISOString(),
    updated_at: new Date(1710000300000).toISOString(),
  })
})

it('maps a Supabase row back to the interface shape', () => {
  expect(fromMemoryRow(toMemoryRow(memory, 'user-1'))).toEqual(memory)
})

it('rejects invalid types and blank content', () => {
  expect(() => normalizeMemory({ ...memory, type: 'other' })).toThrow('Tipo de memória inválido.')
  expect(() => normalizeMemory({ ...memory, content: '   ' })).toThrow('O conteúdo da memória é obrigatório.')
})
```

- [ ] **Step 2: Run the model test and verify failure**

Run: `npm test -- src/memories/memoryModel.test.js`

Expected: FAIL because `memoryModel.js` does not exist.

- [ ] **Step 3: Implement the complete memory mapper**

Create `src/memories/memoryModel.js`:

```js
export const MEMORY_TYPES = new Set(['note', 'idea', 'link', 'snippet'])

export function normalizeMemory(value) {
  if (!value || typeof value !== 'object') throw new Error('Memória inválida.')
  if (!MEMORY_TYPES.has(value.type)) throw new Error('Tipo de memória inválido.')
  if (typeof value.content !== 'string' || !value.content.trim()) {
    throw new Error('O conteúdo da memória é obrigatório.')
  }

  const createdAt = Number(value.createdAt)
  const updatedAt = Number(value.updatedAt ?? value.createdAt)
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) {
    throw new Error('Datas da memória inválidas.')
  }

  return {
    id: String(value.id),
    type: value.type,
    content: value.content.trim(),
    url: typeof value.url === 'string' ? value.url.trim() : '',
    tags: Array.isArray(value.tags) ? value.tags.filter(tag => typeof tag === 'string') : [],
    pinned: Boolean(value.pinned),
    createdAt,
    updatedAt,
  }
}

export function toMemoryRow(value, userId) {
  const memory = normalizeMemory(value)
  return {
    id: memory.id,
    user_id: userId,
    type: memory.type,
    content: memory.content,
    url: memory.url,
    tags: memory.tags,
    pinned: memory.pinned,
    created_at: new Date(memory.createdAt).toISOString(),
    updated_at: new Date(memory.updatedAt).toISOString(),
  }
}

export function fromMemoryRow(row) {
  return normalizeMemory({
    id: row.id,
    type: row.type,
    content: row.content,
    url: row.url ?? '',
    tags: row.tags ?? [],
    pinned: row.pinned ?? false,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  })
}
```

- [ ] **Step 4: Write repository tests for individual operations**

Create `src/memories/memoryRepository.test.js` with a recording query builder and assert these exact calls:

```js
import { describe, expect, it, vi } from 'vitest'
import { createMemoryRepository } from './memoryRepository.js'

function builder(result) {
  const api = {
    select: vi.fn(() => api), order: vi.fn(() => api),
    insert: vi.fn(() => api), upsert: vi.fn(() => api), update: vi.fn(() => api),
    delete: vi.fn(() => api), eq: vi.fn(() => api), single: vi.fn(async () => result),
    then: (resolve) => resolve(result),
  }
  return api
}

it('loads rows ordered by updated_at descending', async () => {
  const query = builder({ data: [], error: null })
  const client = { from: vi.fn(() => query) }
  await createMemoryRepository(client).listMemories()
  expect(client.from).toHaveBeenCalledWith('memory_items')
  expect(query.select).toHaveBeenCalledWith('*')
  expect(query.order).toHaveBeenCalledWith('updated_at', { ascending: false })
})

it('deletes only the requested id', async () => {
  const query = builder({ error: null })
  const client = { from: vi.fn(() => query) }
  await createMemoryRepository(client).deleteMemory('memory-1')
  expect(query.delete).toHaveBeenCalledOnce()
  expect(query.eq).toHaveBeenCalledWith('id', 'memory-1')
})

it('surfaces Supabase errors instead of falling back locally', async () => {
  const query = builder({ data: null, error: { message: 'network down' } })
  const client = { from: vi.fn(() => query) }
  await expect(createMemoryRepository(client).listMemories()).rejects.toThrow('network down')
})
```

- [ ] **Step 5: Implement the repository**

Create `src/memories/memoryRepository.js`:

```js
import { getSupabaseClient } from '../lib/supabase.js'
import { fromMemoryRow, toMemoryRow } from './memoryModel.js'

function unwrap({ data, error }) {
  if (error) throw new Error(error.message || 'Não foi possível sincronizar as memórias.')
  return data
}

export function createMemoryRepository(client = getSupabaseClient()) {
  return {
    async listMemories() {
      const result = await client.from('memory_items').select('*').order('updated_at', { ascending: false })
      return (unwrap(result) ?? []).map(fromMemoryRow)
    },
    async createMemory(memory, userId) {
      const result = await client.from('memory_items').insert(toMemoryRow(memory, userId)).select('*').single()
      return fromMemoryRow(unwrap(result))
    },
    async updateMemory(memory, userId) {
      const row = toMemoryRow(memory, userId)
      const result = await client.from('memory_items').update(row).eq('id', memory.id).select('*').single()
      return fromMemoryRow(unwrap(result))
    },
    async deleteMemory(id) {
      unwrap(await client.from('memory_items').delete().eq('id', id))
    },
    async importMemories(memories, userId) {
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      const rows = memories.map(memory => toMemoryRow({
        ...memory,
        id: uuid.test(String(memory.id)) ? String(memory.id) : crypto.randomUUID(),
      }, userId))
      const result = await client.from('memory_items').upsert(rows, { onConflict: 'id' }).select('*')
      return (unwrap(result) ?? []).map(fromMemoryRow)
    },
  }
}

export const memoryRepository = {
  listMemories: (...args) => createMemoryRepository().listMemories(...args),
  createMemory: (...args) => createMemoryRepository().createMemory(...args),
  updateMemory: (...args) => createMemoryRepository().updateMemory(...args),
  deleteMemory: (...args) => createMemoryRepository().deleteMemory(...args),
  importMemories: (...args) => createMemoryRepository().importMemories(...args),
}
```

Extend `memoryRepository.test.js` to assert `importMemories` calls `upsert(rows, { onConflict: 'id' })`, remaps a non-UUID id with mocked `crypto.randomUUID()`, and returns mapped rows without deleting existing rows.

- [ ] **Step 6: Add the reproducible SQL migration**

Create `supabase/migrations/202607110001_create_memory_items.sql`:

```sql
create extension if not exists pgcrypto;

create table if not exists public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('note', 'idea', 'link', 'snippet')),
  content text not null check (length(trim(content)) > 0),
  url text not null default '',
  tags text[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_items_user_updated_idx
  on public.memory_items (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memory_items_set_updated_at on public.memory_items;
create trigger memory_items_set_updated_at
before update on public.memory_items
for each row execute function public.set_updated_at();

alter table public.memory_items enable row level security;
revoke all on public.memory_items from anon;
grant select, insert, update, delete on public.memory_items to authenticated;

drop policy if exists "memory_items_select_own" on public.memory_items;
create policy "memory_items_select_own" on public.memory_items
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "memory_items_insert_own" on public.memory_items;
create policy "memory_items_insert_own" on public.memory_items
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "memory_items_update_own" on public.memory_items;
create policy "memory_items_update_own" on public.memory_items
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "memory_items_delete_own" on public.memory_items;
create policy "memory_items_delete_own" on public.memory_items
for delete to authenticated using ((select auth.uid()) = user_id);
```

- [ ] **Step 7: Run memory tests**

Run: `npm test -- src/memories/memoryModel.test.js src/memories/memoryRepository.test.js`

Expected: PASS with all model and repository tests passing; no request uses `localStorage`.

- [ ] **Step 8: Commit data access and SQL**

```powershell
git add src/memories supabase/migrations/202607110001_create_memory_items.sql
git commit -m "feat: add secured memory repository"
```

---

### Task 3: Supabase Authentication API and Provider

**Files:**
- Create: `src/auth/authApi.js`
- Test: `src/auth/authApi.test.js`
- Create: `src/auth/AuthContext.jsx`
- Test: `src/auth/AuthContext.test.jsx`
- Modify: `src/main.jsx:1-10`

**Interfaces:**
- Consumes: `getSupabaseClient()` and Supabase auth events.
- Produces: `createAuthApi(client)`, `AuthProvider`, and `useAuth() -> { session, user, initializing, authError, signUp, signIn, signOut, requestPasswordReset, updatePassword }`.

- [ ] **Step 1: Write failing authentication API tests**

Create `src/auth/authApi.test.js` using a mocked `{ auth }` client and verify:

```js
import { expect, it, vi } from 'vitest'
import { createAuthApi } from './authApi.js'

it('returns confirmationPending when signup creates no session', async () => {
  const auth = { signUp: vi.fn(async () => ({ data: { user: { id: 'u1' }, session: null }, error: null })) }
  await expect(createAuthApi({ auth }).signUp({ name: 'Ana', email: 'ana@example.com', password: 'secret123' }))
    .resolves.toEqual({ confirmationPending: true, user: { id: 'u1' } })
  expect(auth.signUp).toHaveBeenCalledWith({
    email: 'ana@example.com', password: 'secret123',
    options: { data: { name: 'Ana' }, emailRedirectTo: `${window.location.origin}/` },
  })
})

it('requests a neutral password reset redirect', async () => {
  const auth = { resetPasswordForEmail: vi.fn(async () => ({ error: null })) }
  await createAuthApi({ auth }).requestPasswordReset('ana@example.com')
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@example.com', {
    redirectTo: `${window.location.origin}/`,
  })
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- src/auth/authApi.test.js`

Expected: FAIL because `authApi.js` does not exist.

- [ ] **Step 3: Implement explicit auth commands with no local fallback**

Create `src/auth/authApi.js`:

```js
function authMessage(error, fallback) {
  const message = error?.message ?? ''
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha inválidos.'
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.'
  if (/user already registered/i.test(message)) return 'Já existe uma conta para este e-mail.'
  if (/password.*at least|weak password/i.test(message)) return 'Use uma senha com pelo menos 8 caracteres.'
  if (/rate limit/i.test(message)) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  return fallback
}

function throwIfError(error, fallback) {
  if (error) throw new Error(authMessage(error, fallback))
}

export function createAuthApi(client) {
  return {
    async signUp({ name, email, password }) {
      const { data, error } = await client.auth.signUp({
        email: email.trim(), password,
        options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/` },
      })
      throwIfError(error, 'Não foi possível criar a conta.')
      return { confirmationPending: !data.session, user: data.user }
    },
    async signIn({ email, password }) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      throwIfError(error, 'E-mail ou senha inválidos.')
      return data.session
    },
    async signOut() {
      const { error } = await client.auth.signOut()
      throwIfError(error, 'Não foi possível sair.')
    },
    async requestPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` })
      throwIfError(error, 'Não foi possível enviar o e-mail de recuperação.')
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password })
      throwIfError(error, 'Não foi possível atualizar a senha.')
    },
  }
}
```

- [ ] **Step 4: Write provider transition tests**

In `src/auth/AuthContext.test.jsx`, inject `client` and `api` props into `AuthProvider`; test `INITIAL_SESSION`, `SIGNED_OUT`, `PASSWORD_RECOVERY`, and unsubscribe cleanup. Use a probe component that renders `initializing`, `session?.user.id`, and `recoveryMode` from `useAuth()`.

Expected assertions:

```jsx
expect(screen.getByTestId('initializing')).toHaveTextContent('false')
expect(screen.getByTestId('user')).toHaveTextContent('u1')
expect(screen.getByTestId('recovery')).toHaveTextContent('true')
expect(unsubscribe).toHaveBeenCalledOnce()
```

- [ ] **Step 5: Implement the provider**

Create `src/auth/AuthContext.jsx` with this public state machine:

```jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
const AuthContext = createContext(null)

export function AuthProvider({ children, client, api }) {
  const [session, setSession] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setInitializing(false)
      setRecoveryMode(event === 'PASSWORD_RECOVERY')
    })
    return () => subscription.unsubscribe()
  }, [client])

  const run = async command => {
    setAuthError('')
    try { return await command() }
    catch (error) { setAuthError(error.message); throw error }
  }

  const value = useMemo(() => ({
    session, user: session?.user ?? null, initializing, recoveryMode, authError,
    clearAuthError: () => setAuthError(''),
    signUp: payload => run(() => api.signUp(payload)),
    signIn: payload => run(() => api.signIn(payload)),
    signOut: () => run(() => api.signOut()),
    requestPasswordReset: email => run(() => api.requestPasswordReset(email)),
    updatePassword: password => run(() => api.updatePassword(password)),
  }), [api, authError, initializing, recoveryMode, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return value
}
```

Replace `src/main.jsx` so configuration errors render explicitly before the provider mounts:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { createAuthApi } from './auth/authApi.js'
import { getSupabaseClient } from './lib/supabase.js'

let application
try {
  const client = getSupabaseClient()
  application = (
    <AuthProvider client={client} api={createAuthApi(client)}>
      <App />
    </AuthProvider>
  )
} catch (error) {
  application = <main className="config-error" role="alert">{error.message}</main>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>{application}</StrictMode>,
)
```

- [ ] **Step 6: Run auth tests**

Run: `npm test -- src/auth`

Expected: PASS for API behavior and session transitions, including unsubscribe cleanup.

- [ ] **Step 7: Commit authentication boundaries**

```powershell
git add src/auth src/main.jsx
git commit -m "feat: add Supabase authentication provider"
```

---

### Task 4: Idempotent Legacy Migration

**Files:**
- Create: `src/memories/legacyMigration.js`
- Test: `src/memories/legacyMigration.test.js`

**Interfaces:**
- Consumes: `localStorage['memory-depo-v2']`, the authenticated `user.id`, and a Supabase client.
- Produces: `getLegacyMigration(userId)`, `importLegacyMemories(userId, client)`, and per-user completion key `memory-depo-legacy-imported-v1:<userId>`.

- [ ] **Step 1: Write failing migration tests**

Cover these exact cases in `src/memories/legacyMigration.test.js`:

```js
it('detects valid legacy items without deleting the source payload')
it('returns unavailable for malformed JSON')
it('upserts normalized rows and marks only the current user complete')
it('does not mark completion when Supabase returns an error')
it('does not offer the same migration twice to one user')
```

For a legacy non-UUID id such as `"old-1"`, mock `crypto.randomUUID()` to return `b7e89a26-9de3-4a7b-95d2-0049507139c0` and assert that value is sent.

- [ ] **Step 2: Run the migration test and verify failure**

Run: `npm test -- src/memories/legacyMigration.test.js`

Expected: FAIL because `legacyMigration.js` does not exist.

- [ ] **Step 3: Implement detection and atomic completion marking**

Create `src/memories/legacyMigration.js` with these constants and signatures:

```js
import { toMemoryRow } from './memoryModel.js'

const LEGACY_KEY = 'memory-depo-v2'
const COMPLETE_PREFIX = 'memory-depo-legacy-imported-v1:'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getLegacyMigration(userId, storage = window.localStorage) {
  if (storage.getItem(`${COMPLETE_PREFIX}${userId}`)) return { available: false, items: [] }
  try {
    const parsed = JSON.parse(storage.getItem(LEGACY_KEY) || '[]')
    const items = Array.isArray(parsed) ? parsed : parsed.items
    return { available: Array.isArray(items) && items.length > 0, items: Array.isArray(items) ? items : [] }
  } catch {
    return { available: false, items: [] }
  }
}

export async function importLegacyMemories(userId, client, storage = window.localStorage) {
  const migration = getLegacyMigration(userId, storage)
  if (!migration.available) return []
  const rows = migration.items.map(item => toMemoryRow({
    ...item,
    id: UUID.test(String(item.id)) ? String(item.id) : crypto.randomUUID(),
    updatedAt: item.updatedAt ?? item.createdAt,
  }, userId))
  const { data, error } = await client.from('memory_items').upsert(rows, { onConflict: 'id' }).select('*')
  if (error) throw new Error(error.message || 'Não foi possível importar as memórias antigas.')
  storage.setItem(`${COMPLETE_PREFIX}${userId}`, new Date().toISOString())
  return data
}
```

- [ ] **Step 4: Run focused migration tests**

Run: `npm test -- src/memories/legacyMigration.test.js`

Expected: PASS for all five cases; the original `memory-depo-v2` value remains byte-for-byte unchanged.

- [ ] **Step 5: Commit migration behavior**

```powershell
git add src/memories/legacyMigration.js src/memories/legacyMigration.test.js
git commit -m "feat: migrate legacy browser memories safely"
```

---

### Task 5: Accessible Pull-Cord Lamp and Auth Screens

**Files:**
- Create: `src/components/Lamp.jsx`
- Test: `src/components/Lamp.test.jsx`
- Modify: `src/components/LoginScreen.jsx:1-90`
- Test: `src/components/LoginScreen.test.jsx`

**Interfaces:**
- Consumes: `lampOn`, `onToggle`, auth commands from `useAuth()`, and auth mode state.
- Produces: `Lamp({ on, onToggle })` and `LoginScreen()` with modes `signin`, `signup`, `confirmation`, `forgot`, and `update-password`.

- [ ] **Step 1: Write failing lamp interaction tests**

Create `src/components/Lamp.test.jsx` and verify:

```jsx
it('toggles after a pointer drag beyond 30 pixels')
it('does not toggle after a short pointer drag')
it('toggles with click, Enter, and Space')
it('returns the cord offset to zero after pointerup')
```

Use `fireEvent.pointerDown`, `fireEvent.pointerMove`, and `fireEvent.pointerUp` on the button named `Puxe para acender`.

- [ ] **Step 2: Run the lamp tests and verify failure**

Run: `npm test -- src/components/Lamp.test.jsx`

Expected: FAIL because `Lamp.jsx` does not exist.

- [ ] **Step 3: Implement Pointer Events without GSAP**

Create `src/components/Lamp.jsx`:

```jsx
import { useRef, useState } from 'react'

const LIMIT = 60
const TRIGGER = 30

export default function Lamp({ on, onToggle }) {
  const startY = useRef(null)
  const dragged = useRef(false)
  const [offset, setOffset] = useState(0)

  const finish = event => {
    if (startY.current === null) return
    if (offset > TRIGGER) onToggle()
    dragged.current = offset > 3
    startY.current = null
    setOffset(0)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    <div className="lamp-wrapper" data-on={on}>
      <svg className="lamp-svg" viewBox="0 0 200 300" aria-hidden="true">
        <ellipse className="inner-glow" cx="100" cy="110" rx="60" ry="30" />
        <rect className="lamp-base" x="92" y="100" width="16" height="160" rx="8" />
        <rect className="lamp-base" x="60" y="250" width="80" height="12" rx="6" />
        <line className="cord-line" x1="130" y1="110" x2="130" y2={180 + offset} />
        <circle className="cord-bead" cx="130" cy={190 + offset} r="6" />
        <path className="lamp-shade" d="M30 110 C 30 50, 170 50, 170 110 C 170 125, 30 125, 30 110 Z" />
      </svg>
      <button
        type="button"
        className="cord-control"
        aria-pressed={on}
        aria-label={on ? 'Puxe para apagar' : 'Puxe para acender'}
        onPointerDown={event => {
          startY.current = event.clientY
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }}
        onPointerMove={event => {
          if (startY.current === null) return
          setOffset(Math.min(LIMIT, Math.max(0, event.clientY - startY.current)))
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClick={() => {
          if (dragged.current) { dragged.current = false; return }
          onToggle()
        }}
      />
      <span className="pull-hint">{on ? 'Puxe para apagar' : 'Puxe para acender'}</span>
    </div>
  )
}
```

- [ ] **Step 4: Write auth-screen tests**

Mock `useAuth()` and verify these exact outcomes in `LoginScreen.test.jsx`:

```jsx
expect(screen.queryByRole('form', { name: 'Autenticação' })).not.toBeInTheDocument()
await user.click(screen.getByRole('button', { name: 'Puxe para acender' }))
expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
expect(screen.getByRole('button', { name: 'Esqueci minha senha' })).toBeVisible()
expect(screen.getByLabelText('Nome')).toBeRequired()
expect(screen.getByText('Confira seu e-mail')).toBeVisible()
expect(screen.getByLabelText('Nova senha')).toBeVisible()
```

- [ ] **Step 5: Refactor `LoginScreen` into the five explicit modes**

Replace manual `onSubmit` props with `useAuth()`. Keep local fields `name`, `email`, `password`, `newPassword`, `mode`, `lampOn`, `loading`, and `notice`. Set `mode` to `update-password` whenever `recoveryMode` becomes true. On signup, set `confirmation` only when `result.confirmationPending` is true. The form container must use:

```jsx
<section
  className={`login-form${lampOn ? ' active' : ''}`}
  aria-hidden={!lampOn}
  inert={!lampOn ? '' : undefined}
>
```

Every mode-specific `<form>` must include `aria-label="Autenticação"` so its presence and hidden state are testable through the accessibility tree.

Use these exact primary actions:

```jsx
signin: signIn({ email, password })
signup: signUp({ name, email, password })
forgot: requestPasswordReset(email)
update-password: updatePassword(newPassword)
```

Use `minLength={8}` for password fields, `autoComplete="email"`, `autoComplete="current-password"`, and `autoComplete="new-password"` as appropriate. Recovery success text must remain neutral: `Se existir uma conta para este e-mail, você receberá um link de recuperação.`

- [ ] **Step 6: Run component tests**

Run: `npm test -- src/components/Lamp.test.jsx src/components/LoginScreen.test.jsx`

Expected: PASS for drag threshold, click/keyboard behavior, hidden form, signup confirmation, forgot-password notice, and update-password mode.

- [ ] **Step 7: Commit the auth experience**

```powershell
git add src/components/Lamp.jsx src/components/Lamp.test.jsx src/components/LoginScreen.jsx src/components/LoginScreen.test.jsx
git commit -m "feat: add accessible Lamp authentication flow"
```

---

### Task 6: Authenticated App, Remote CRUD, and Import Prompt

**Files:**
- Modify: `src/App.jsx:1-360`
- Test: `src/App.test.jsx`
- Delete: `src/services/storage.js`

**Interfaces:**
- Consumes: `useAuth()`, `memoryRepository`, `getLegacyMigration`, and `importLegacyMemories`.
- Produces: the existing private Memory Depo UI with remote-only persistence and an import confirmation for the current user.

- [ ] **Step 1: Write failing integration tests around public boundaries**

Mock `useAuth`, `memoryRepository`, and legacy migration functions in `src/App.test.jsx`. Cover:

```jsx
it('shows a startup state while the session is restoring')
it('shows LoginScreen without loading memories when signed out')
it('loads memories before enabling private mutations')
it('creates one remote row and appends the returned memory')
it('updates only the edited row')
it('pins only the selected row through updateMemory')
it('deletes only after remote confirmation')
it('keeps the editor contents when a mutation fails')
it('offers legacy import once and reloads after successful import')
it('preserves search and type filters over remotely loaded memories')
it('copies content and exports the current remote list as JSON')
it('imports a JSON backup through importMemories and refreshes the list')
it('logs out through Supabase and never writes a password locally')
```

The create test must assert:

```js
expect(memoryRepository.createMemory).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'idea', content: 'Nova ideia' }),
  'user-1',
)
```

- [ ] **Step 2: Run the App tests and verify the old local implementation fails**

Run: `npm test -- src/App.test.jsx`

Expected: FAIL because `App.jsx` still imports `src/services/storage.js`, saves lists wholesale, and receives no `AuthContext` state.

- [ ] **Step 3: Replace local session and list-saving effects**

In `App.jsx`:

- remove imports from `./services/storage.js`;
- import `useAuth`, `memoryRepository`, `getLegacyMigration`, `importLegacyMemories`, and `getSupabaseClient`;
- replace the local `session`, `authMode`, `authError`, and `authLoading` states with `const { session, user, initializing, signOut } = useAuth()`;
- add `dataLoading`, `mutationId`, and `legacyOffer` states;
- load with `memoryRepository.listMemories()` only after `user?.id` exists;
- render a startup panel while `initializing` is true;
- render `<LoginScreen />` when no session exists;
- render the private UI only after the initial list request settles.

The load effect must guard stale results:

```jsx
useEffect(() => {
  if (!user?.id) { setItems([]); return }
  let cancelled = false
  setDataLoading(true)
  memoryRepository.listMemories()
    .then(next => { if (!cancelled) setItems(next) })
    .catch(error => { if (!cancelled) showStatus(error.message, 'error') })
    .finally(() => { if (!cancelled) setDataLoading(false) })
  return () => { cancelled = true }
}, [showStatus, user?.id])
```

- [ ] **Step 4: Convert each action to one awaited repository command**

Make `addOrUpdateItem`, `togglePin`, and `deleteItem` async. Build the candidate object first, set `mutationId`, await the corresponding repository method, update only the returned or deleted row, clear `mutationId`, and keep form values when an error occurs. Do not add an effect that persists the entire `items` array.

The create branch must use:

```jsx
const created = await memoryRepository.createMemory({
  id: createId(), type: formType, content, url, tags,
  pinned: false, createdAt: now, updatedAt: now,
}, user.id)
setItems(prev => [created, ...prev])
resetForm()
```

- [ ] **Step 5: Add the import offer after the first successful load**

After loading, call `getLegacyMigration(user.id)`. If available, render an accessible dialog with `Importar memórias deste navegador` and `Agora não`. On confirmation, call:

```jsx
await importLegacyMemories(user.id, getSupabaseClient())
setItems(await memoryRepository.listMemories())
setLegacyOffer(null)
showStatus('Memórias antigas importadas com sucesso.', 'success')
```

If import rejects, keep the dialog open and show the error.

Update the existing JSON import handler to call `memoryRepository.importMemories(incoming, user.id)`, merge by returned id, and change the confirmation copy to `Importar e mesclar estas memórias com sua conta?`. Do not restore a whole-list persistence effect and do not delete remote rows that are absent from the JSON file.

- [ ] **Step 6: Remove the insecure local service**

Delete `src/services/storage.js` only after `rg -n "services/storage|memory-depo-users-v1|password:" src` returns no production-code matches. Keep `memory-depo-v2` only in `legacyMigration.js`.

- [ ] **Step 7: Run App and regression tests**

Run: `npm test -- src/App.test.jsx src/memories src/auth src/components`

Expected: PASS; no test observes bulk delete-and-reinsert behavior or plaintext password persistence.

- [ ] **Step 8: Commit remote-only application wiring**

```powershell
git add src/App.jsx src/App.test.jsx src/services/storage.js
git commit -m "feat: connect Memory Depo to remote user data"
```

---

### Task 7: Responsive Lamp Styling and Accessibility Regression

**Files:**
- Modify: `src/styles.css:709-end`
- Test: `src/components/LoginScreen.test.jsx`

**Interfaces:**
- Consumes: `.auth-page`, `.auth-card`, `.lamp-wrapper[data-on]`, `.cord-control`, `.pull-hint`, and `.login-form.active` from Task 5.
- Produces: approved two-column desktop layout, stacked mobile layout, hidden/inert off state, focus styles, and reduced motion.

- [ ] **Step 1: Extend the component test with structural accessibility assertions**

Add assertions that the off form has `aria-hidden="true"` and `inert`, the cord has a visible focusable button, the on form has `aria-hidden="false"`, and all inputs retain explicit labels.

- [ ] **Step 2: Run the focused test before CSS replacement**

Run: `npm test -- src/components/LoginScreen.test.jsx`

Expected: PASS for DOM semantics; visual regression is completed by manual viewport verification in Step 4.

- [ ] **Step 3: Replace the appended auth CSS with the approved responsive rules**

Implement these required rule groups in `src/styles.css`:

```css
.auth-page { min-height: 100dvh; overflow-y: auto; padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom)); }
.auth-card { width: min(980px, 100%); display: grid; grid-template-columns: 1.1fr .95fr; align-items: center; }
.login-form { opacity: 0; visibility: hidden; pointer-events: none; transform: translateY(30px); }
.login-form.active { opacity: 1; visibility: visible; pointer-events: auto; transform: translateY(0); }
.cord-control { position: absolute; left: 65%; top: 54%; width: 54px; height: 120px; border: 0; background: transparent; cursor: grab; touch-action: none; }
.cord-control:focus-visible { outline: 3px solid #f7d58c; outline-offset: 4px; border-radius: 999px; }
.pull-hint { color: #c8b98f; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; }

@media (max-width: 720px) {
  .auth-page { place-items: start center; padding-inline: 16px; }
  .auth-card { grid-template-columns: 1fr; gap: 0; padding: 16px; }
  .lamp-wrapper { min-height: 230px; }
  .lamp-svg { width: min(230px, 70vw); }
  .login-form { padding: 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .auth-page *, .auth-page *::before, .auth-page *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

Retain the approved gold button, dark background, radial light, and active lamp glow. Remove duplicate `.login-form`, `.form-group`, and lamp declarations so one selector source controls each state.

- [ ] **Step 4: Verify desktop, mobile, touch, and keyboard behavior**

Run: `npm run dev -- --host 127.0.0.1`

Verify at `1280x800`, `720x900`, `390x844`, and `320x568`:

- off state shows only lamp and pull instruction;
- dragging past 30px turns the lamp on and reveals the form;
- a short drag returns without toggling;
- click, `Enter`, and `Space` toggle once each;
- mobile stacks lamp above the form and scrolls without clipping;
- focus indicators are visible;
- reduced-motion emulation preserves toggling.

Expected: all checks pass with no horizontal scrollbar and no console errors.

- [ ] **Step 5: Commit responsive styling**

```powershell
git add src/styles.css src/components/LoginScreen.test.jsx
git commit -m "style: make Lamp login responsive and accessible"
```

---

### Task 8: Documentation, Security Verification, and Production Build

**Files:**
- Modify: `README.md`
- Verify: `supabase/migrations/202607110001_create_memory_items.sql`
- Verify: all source and test files from Tasks 1–7

**Interfaces:**
- Consumes: completed application and a managed Supabase project.
- Produces: reproducible setup instructions and evidence that auth, RLS, tests, and production build work.

- [ ] **Step 1: Document managed Supabase setup**

Add exact README sections for:

1. copying `.env.example` to `.env.local` and filling the project URL and publishable key;
2. running the SQL migration in Supabase SQL Editor or with `supabase db push`;
3. enabling Email provider, `Allow new users to sign up`, and `Confirm Email`;
4. adding `http://localhost:5173/**` and the production Vercel URL to Redirect URLs;
5. configuring custom SMTP for production because the default service is rate-limited;
6. setting the same two `VITE_` variables in Vercel;
7. explaining the one-time `memory-depo-v2` import and retained browser backup;
8. running `npm test`, `npm run build`, and `npm run dev`.

- [ ] **Step 2: Run static secret and insecure-fallback scans**

Run:

```powershell
rg -n "service_role|memory-depo-users-v1|password\s*:|falling back|fallback to local|localUser" src .env.example README.md
```

Expected: no production-code matches for secrets, plaintext local users, or local fallback. Legitimate test fixture labels must not contain real credentials.

- [ ] **Step 3: Run the complete automated suite**

Run: `npm test`

Expected: exit `0`; all auth, memory, migration, Lamp, and App tests pass.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: exit `0`; Vite writes `dist/` with no unresolved imports or compilation errors.

- [ ] **Step 5: Verify real Supabase auth and RLS with two accounts**

In the configured test project:

1. create account A and confirm its email;
2. create account B and confirm its email;
3. create one distinct memory in each account;
4. confirm each account lists only its own row;
5. from account A, attempt `select`, `update`, and `delete` using account B's row id through the browser client;
6. confirm the operations return no accessible row and account B's row remains unchanged;
7. request a password reset for account A, follow the link, set a new password, and sign in with it;
8. reload the page and confirm the authenticated session and memories are restored.

Expected: confirmation and recovery emails arrive; cross-user operations expose or alter zero rows; session refresh works.

- [ ] **Step 6: Review the final diff without absorbing unrelated user work**

Run:

```powershell
git status --short
git diff --check
git diff --stat
```

Expected: no whitespace errors; only files listed by this plan are staged for the final commit. `tmp-login-form/`, `Login-Form-Lamp.zip`, and unrelated pre-existing edits remain untouched unless the user explicitly includes them.

- [ ] **Step 7: Commit documentation**

```powershell
git add README.md
git commit -m "docs: explain Supabase deployment and recovery"
```

- [ ] **Step 8: Record final verification**

Run:

```powershell
git log --oneline -8
npm test
npm run build
```

Expected: the task commits appear in order; tests and build both exit `0`. Report any manual Supabase step that still requires project credentials instead of claiming it passed.
