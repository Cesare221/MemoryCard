import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import './styles.css'
import LoginScreen from './components/LoginScreen.jsx'
import Modal from './components/Modal.jsx'
import { IconSearch, IconX, IconPin, IconTrash, IconCopy, IconCheck, IconEdit, IconLink, IconBrain, IconSun, IconMoon, IconChevronDown, IconChevronUp, IconMaximize, IconImage, TypeIcon } from './components/Icons.jsx'
import {
  signUp, signIn, signOut, tryRestoreSession, isMigrationDone, markMigrationDone,
  detectLegacyItems, clearLegacyStorage, updatePassword,
} from './services/authService.js'
import { supabase } from './lib/supabaseClient.js'
import { createItem as createRemoteItem, deleteItem as deleteRemoteItem, normalizeItems } from './services/memoryService.js'
import { useTheme } from './hooks/useTheme.js'
import { useMemories } from './hooks/useMemories.js'

const TYPE_META = {
  note: { label: 'Nota', color: '#6366f1', dim: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', placeholder: 'Escreva uma nota ou pensamento…' },
  idea: { label: 'Ideia', color: '#f59e0b', dim: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', placeholder: 'Capture uma ideia…' },
  link: { label: 'Link', color: '#38bdf8', dim: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)', placeholder: 'Descreva este link…' },
  snippet: { label: 'Trecho', color: '#34d399', dim: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)', placeholder: 'Cole um código ou trecho de texto…' },
}

const FILTERS = [
  { value: 'all', label: 'Tudo' },
  { value: 'images', label: 'Imagens' },
  { value: 'note', label: 'Notas' },
  { value: 'idea', label: 'Ideias' },
  { value: 'link', label: 'Links' },
  { value: 'snippet', label: 'Trechos' },
]

const CARD_PREVIEW_LIMIT = 360
const CARD_PREVIEW_LINES = 7
const IMAGE_MAX_SOURCE_BYTES = 6 * 1024 * 1024
const IMAGE_MAX_DATA_URL_CHARS = 950000
const IMAGE_MAX_DIMENSION = 1280
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function createId() {
  const cryptoObj = globalThis.crypto
  return cryptoObj?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatRelative(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'agora'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d atrás`
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', day: 'numeric' }).format(new Date(ts))
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nao foi possivel processar a imagem.'))
    image.src = dataUrl
  })
}

async function prepareMemoryImage(file) {
  if (!file) return ''
  if (!IMAGE_TYPES.has(file.type)) throw new Error('Use uma imagem JPG, PNG, WebP ou GIF.')
  if (file.size > IMAGE_MAX_SOURCE_BYTES) throw new Error('Escolha uma imagem de ate 6 MB.')

  const original = await readFileAsDataUrl(file)
  if (file.type === 'image/gif') {
    if (original.length > IMAGE_MAX_DATA_URL_CHARS) throw new Error('Este GIF ficou grande demais para salvar.')
    return original
  }

  const image = await loadImage(original)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const largestSide = Math.max(width, height)
  if (largestSide <= IMAGE_MAX_DIMENSION && original.length <= IMAGE_MAX_DATA_URL_CHARS) return original

  const scale = Math.min(1, IMAGE_MAX_DIMENSION / largestSide)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Nao foi possivel comprimir a imagem.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  for (const quality of [0.86, 0.76, 0.66, 0.56]) {
    const compressed = canvas.toDataURL('image/jpeg', quality)
    if (compressed.length <= IMAGE_MAX_DATA_URL_CHARS) return compressed
  }

  throw new Error('A imagem ficou grande demais mesmo depois da compressao.')
}

export default function App() {
  const [session, setSession] = useState(() => tryRestoreSession())
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [formType, setFormType] = useState('note')
  const [formContent, setFormContent] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formImageData, setFormImageData] = useState('')
  const [formImageName, setFormImageName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [status, setStatus] = useState(null)
  const [authMode, setAuthMode] = useState('signin')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState(null)
  const [passwordResetMode, setPasswordResetMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalConfig, setModalConfig] = useState(null)
  const [focusEditorOpen, setFocusEditorOpen] = useState(false)

  const { theme, toggleTheme } = useTheme()
  const {
    items, setItems, syncStatus, recentlyDeleted, pendingCount,
    addItem, deleteItem, undoDelete, updateItem, loadItems, saveLocalCache,
  } = useMemories(session)

  const searchRef = useRef(null)
  const textareaRef = useRef(null)
  const focusTextareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const statusTimerRef = useRef(null)

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordResetMode(true)
    })
    return () => authListener?.subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (!session) { setItems([]); setLoading(false); return }
      setLoading(true)
      await loadItems()
      if (!cancelled) setLoading(false)
    }
    hydrate()
    return () => { cancelled = true }
  }, [session])

  useEffect(() => {
    if (!session) return
    if (isMigrationDone(session.id)) return
    const legacyItems = detectLegacyItems()
    if (legacyItems.length === 0) { markMigrationDone(session.id); return }
    const normalized = normalizeItems(legacyItems)
    if (normalized.length === 0) { markMigrationDone(session.id); clearLegacyStorage(); return }
    importLegacyItems(normalized)
    markMigrationDone(session.id)
    clearLegacyStorage()
  }, [session])

  async function importLegacyItems(legacyItems) {
    const existingIds = new Set(items.map((i) => i.id))
    const newItems = legacyItems.filter((i) => !existingIds.has(i.id))
    if (newItems.length === 0) return
    setModalConfig({
      title: 'Importar memórias antigas',
      message: `Encontramos ${newItems.length} memória(s) salvas anteriormente no navegador. Deseja importá-las para sua conta?`,
      confirmLabel: 'Importar',
      cancelLabel: 'Ignorar',
      onConfirm: async () => {
        setModalConfig(null)
        for (const item of newItems) {
          try { await createRemoteItem(item, session.id) } catch {}
        }
        loadItems()
      },
      onCancel: () => setModalConfig(null),
    })
  }

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => () => { if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current) }, [])

  const showStatus = useCallback((message, tone = 'info') => {
    setStatus({ message, tone })
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)
    statusTimerRef.current = window.setTimeout(() => setStatus(null), 2600)
  }, [])

  const handleAuthSubmit = useCallback(async ({ email, password, name }) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      if (authMode === 'signup') {
        const result = await signUp({ email, password, name })
        if (result.session) { setSession(result.session); showStatus('Conta criada com sucesso.', 'success') }
        else setRegisteredEmail(email)
      } else {
        const result = await signIn({ email, password })
        setSession(result.session)
        showStatus('Login realizado com sucesso.', 'success')
      }
    } catch (error) {
      setAuthError(error.message || 'Não foi possível concluir a autenticação.')
    } finally { setAuthLoading(false) }
  }, [authMode, showStatus])

  const handlePasswordUpdate = useCallback(async ({ password }) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      await updatePassword({ password })
      setPasswordResetMode(false)
      setAuthMode('signin')
      showStatus('Senha atualizada com sucesso. Faça login com sua nova senha.', 'success')
    } catch (error) {
      setAuthError(error.message || 'Não foi possível atualizar a senha.')
    } finally { setAuthLoading(false) }
  }, [showStatus])

  const handleLogout = useCallback(async () => {
    await signOut()
    setSession(null)
    setQuery('')
    setFilterType('all')
    setRegisteredEmail(null)
    showStatus('Sessão encerrada.', 'info')
  }, [showStatus])

  const counts = useMemo(() => ({
    all: items.length,
    images: items.filter(i => i.imageData).length,
    note: items.filter(i => i.type === 'note').length,
    idea: items.filter(i => i.type === 'idea').length,
    link: items.filter(i => i.type === 'link').length,
    snippet: items.filter(i => i.type === 'snippet').length,
  }), [items])

  const filtered = useMemo(() => {
    let result = [...items]
    if (filterType === 'images') result = result.filter(i => i.imageData)
    else if (filterType !== 'all') result = result.filter(i => i.type === filterType)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(i =>
        (i.content || '').toLowerCase().includes(q) ||
        (i.url && i.url.toLowerCase().includes(q)) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)
    })
  }, [items, query, filterType])

  const resetForm = useCallback(() => {
    setEditingId(null)
    setFormType('note')
    setFormContent('')
    setFormTags('')
    setFormUrl('')
    setFormImageData('')
    setFormImageName('')
  }, [])

  const addOrUpdateItem = useCallback(async () => {
    if (!formContent.trim() && !formImageData) return
    const tags = formTags.split(',').map(t => t.trim()).filter(Boolean)
    const content = formContent.trim()
    const url = formType === 'link' ? formUrl.trim() : ''
    const now = Date.now()

    if (editingId) {
      await updateItem(editingId, { type: formType, content, url, tags, imageData: formImageData, updatedAt: now })
      resetForm()
      textareaRef.current?.focus()
      showStatus('Memória atualizada.', 'success')
    } else {
      const newItem = { id: createId(), type: formType, content, url, tags, imageData: formImageData, pinned: false, createdAt: now, updatedAt: now, user_id: session?.id }
      await addItem(newItem.type, newItem.content, newItem.tags, newItem.url, newItem.imageData)
      resetForm()
      textareaRef.current?.focus()
      showStatus('Memória adicionada.', 'success')
    }
  }, [editingId, formContent, formTags, formType, formUrl, formImageData, session, resetForm, showStatus, addItem, updateItem])

  const addOrUpdateFromFocus = useCallback(async () => {
    if (!formContent.trim() && !formImageData) return
    setFocusEditorOpen(false)
    await addOrUpdateItem()
  }, [formContent, formImageData, addOrUpdateItem])

  const handleImageSelect = useCallback(async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imageData = await prepareMemoryImage(file)
      setFormImageData(imageData)
      setFormImageName(file.name)
      showStatus('Imagem adicionada a memoria.', 'success')
    } catch (error) {
      showStatus(error.message || 'Nao foi possivel adicionar a imagem.', 'error')
    }
  }, [showStatus])

  const removeFormImage = useCallback(() => {
    setFormImageData('')
    setFormImageName('')
    showStatus('Imagem removida.', 'info')
  }, [showStatus])

  const handleDelete = useCallback((itemId) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    if (editingId === itemId) resetForm()
    deleteItem(item)
    showStatus('Memória excluída.', 'info')
  }, [items, editingId, resetForm, showStatus, deleteItem])

  const copyItem = useCallback(item => {
    const text = item.url ? `${item.content}\n${item.url}` : item.content
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(item.id)
      showStatus('Copiado para a área de transferência.', 'success')
      window.setTimeout(() => setCopiedId(null), 1500)
    }).catch(() => showStatus('Não foi possível copiar automaticamente.', 'error'))
  }, [showStatus])

  const editItem = useCallback(item => {
    setEditingId(item.id)
    setFormType(item.type)
    setFormContent(item.content)
    setFormTags(item.tags.join(', '))
    setFormUrl(item.url ?? '')
    setFormImageData(item.imageData ?? '')
    setFormImageName(item.imageData ? 'Imagem anexada' : '')
    showStatus('Editando memória.', 'info')
    textareaRef.current?.focus()
  }, [showStatus])

  const cancelEdit = useCallback(() => { resetForm(); showStatus('Edição cancelada.', 'info') }, [resetForm, showStatus])

  const exportItems = useCallback(() => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: 'memory depo', version: 2, items }, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `memory-depo-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0)
    showStatus('Exportação concluída.', 'success')
  }, [items, showStatus])

  const importItems = useCallback(async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const incoming = normalizeItems(Array.isArray(parsed) ? parsed : parsed.items)
      if (incoming.length === 0) { showStatus('O arquivo não contém memórias válidas.', 'error'); return }
      setModalConfig({
        title: 'Importar memórias',
        message: `Importar ${incoming.length} memória(s)? Isso vai substituir os dados atuais.`,
        confirmLabel: 'Substituir',
        cancelLabel: 'Cancelar',
        tone: 'danger',
        onConfirm: async () => {
          setModalConfig(null)
          for (const item of items) { try { await deleteRemoteItem(item.id) } catch {} }
          for (const item of incoming) { try { await createRemoteItem(item, session.id) } catch {} }
          loadItems()
          showStatus('Importação concluída.', 'success')
        },
        onCancel: () => setModalConfig(null),
      })
    } catch { showStatus('Arquivo inválido. Use um JSON exportado pelo app.', 'error') }
  }, [items, session, showStatus, loadItems])

  const togglePin = useCallback(async (id) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    await updateItem(id, { pinned: !item.pinned, updatedAt: Date.now() })
  }, [items, updateItem])

  const pinnedItems = filtered.filter(i => i.pinned)
  const unpinnedItems = filtered.filter(i => !i.pinned)
  const meta = TYPE_META[formType]
  const quickTextareaRows = Math.min(8, Math.max(3, formContent.split('\n').length, Math.ceil(formContent.length / 90)))
  const hasDraft = Boolean(formContent.trim() || formImageData)

  useEffect(() => {
    if (!focusEditorOpen) return
    const timer = window.setTimeout(() => focusTextareaRef.current?.focus(), 0)
    const handler = (e) => {
      if (e.key === 'Escape') setFocusEditorOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handler)
    }
  }, [focusEditorOpen])

  if (!session || passwordResetMode) {
    return (
      <>
        <LoginScreen
          mode={authMode}
          onSubmit={handleAuthSubmit}
          onPasswordUpdate={handlePasswordUpdate}
          onSwitchMode={setAuthMode}
          loading={authLoading}
          error={authError}
          registeredEmail={registeredEmail}
          passwordResetMode={passwordResetMode}
        />
        <Modal open={!!modalConfig} title={modalConfig?.title} message={modalConfig?.message}
          confirmLabel={modalConfig?.confirmLabel} cancelLabel={modalConfig?.cancelLabel}
          tone={modalConfig?.tone} onConfirm={modalConfig?.onConfirm} onCancel={modalConfig?.onCancel} />
      </>
    )
  }

  return (
    <>
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <div className="header-left">
              <div>
                <h1 className="header-title">memory depo</h1>
                <p className="header-sub">Notas, ideias, links e trechos em um espaço silencioso e pessoal</p>
              </div>
            </div>
            <div className="header-actions">
              <span className={`sync-badge ${syncStatus}`}>
                {syncStatus === 'saving' && 'Salvando…'}
                {syncStatus === 'error' && 'Erro ao salvar'}
                {syncStatus === 'idle' && items.length > 0 && 'Salvo'}
              </span>
              <button className="ghost-btn" onClick={toggleTheme} type="button" aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
                {theme === 'dark' ? <IconSun /> : <IconMoon />}
              </button>
              {pendingCount > 0 && <span className="sync-badge error">{pendingCount} pendente(s)</span>}
              <span className="user-pill">{session?.name || session?.email}</span>
              <button className="ghost-btn" onClick={handleLogout} type="button">Sair</button>
            </div>
            <div className="header-right">
              <div className="search-wrap">
                <span className="search-icon"><IconSearch /></span>
                <input ref={searchRef} type="text" className="search-input" placeholder="Pesquisar… ⌘K"
                  value={query} onChange={e => setQuery(e.target.value)} aria-label="Pesquisar" />
                {query && (
                  <button className="search-clear" onClick={() => setQuery('')} aria-label="Limpar pesquisa" type="button"><IconX /></button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="main">
          {status && <div className={`status-bar ${status.tone}`} role="status" aria-live="polite">{status.message}</div>}

          {recentlyDeleted && (
            <div className="status-bar info" role="alert">
              Memória excluída.
              <button className="ghost-btn" onClick={undoDelete} type="button" style={{ marginLeft: 8, textDecoration: 'underline' }}>Desfazer</button>
            </div>
          )}

          <div className="quick-add" style={{ '--type-color': meta.color, '--type-dim': meta.dim, '--type-border': meta.border }}>
            <div className="type-selector">
              {Object.entries(TYPE_META).map(([value, m]) => (
                <button key={value}
                  className={`type-pill${formType === value ? ' active' : ''}`}
                  style={formType === value ? { background: m.dim, borderColor: m.border, color: m.color } : {}}
                  onClick={() => setFormType(value)} type="button">
                  <TypeIcon type={value} />{m.label}
                </button>
              ))}
            </div>

            <div className="textarea-shell">
            <textarea ref={textareaRef} className="quick-textarea" placeholder={meta.placeholder}
                style={{ minHeight: `${Math.min(220, Math.max(80, quickTextareaRows * 24 + 32))}px` }}
              value={formContent} onChange={e => setFormContent(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addOrUpdateItem() }}
              rows={3} aria-label="Conteúdo" />

              <button className="textarea-expand-btn" onClick={() => setFocusEditorOpen(true)}
                type="button" aria-label="Abrir editor em foco" title="Abrir editor em foco">
                <IconMaximize />
              </button>
            </div>

            {formType === 'link' && (
              <input type="url" className="form-input" placeholder="https://…"
                value={formUrl} onChange={e => setFormUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOrUpdateItem()} aria-label="URL" />
            )}

            <div className="image-attach-row">
              <button className={`ghost-btn image-attach-btn${formImageData ? ' active' : ''}`}
                onClick={() => imageInputRef.current?.click()} type="button">
                <IconImage />{formImageData ? 'Trocar imagem' : 'Adicionar imagem'}
              </button>
              {formImageData && (
                <button className="ghost-btn image-remove-btn" onClick={removeFormImage} type="button">
                  <IconX />Remover imagem
                </button>
              )}
              <input ref={imageInputRef} className="visually-hidden" type="file" accept={IMAGE_ACCEPT} onChange={handleImageSelect} />
            </div>

            {formImageData && (
              <div className="image-preview">
                <img src={formImageData} alt="Previa da imagem da memoria" />
                <span>{formImageName || 'Imagem anexada'}</span>
              </div>
            )}

            <div className="quick-footer">
              <input type="text" className="form-input" placeholder="Tags: design, todo, referência"
                value={formTags} onChange={e => setFormTags(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOrUpdateItem()} aria-label="Tags" />
              <button className="btn-primary" onClick={addOrUpdateItem} disabled={!hasDraft} type="button">
                {editingId ? 'Salvar alterações' : 'Adicionar'}
                <span className="btn-shortcut">⌘↵</span>
              </button>
            </div>

            <div className="quick-utility-row">
              {editingId && <button className="ghost-btn" onClick={cancelEdit} type="button">Cancelar edição</button>}
              <button className="ghost-btn" onClick={exportItems} type="button">Exportar JSON</button>
              <button className="ghost-btn" onClick={() => fileInputRef.current?.click()} type="button">Importar JSON</button>
              <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json" onChange={importItems} />
            </div>
          </div>

          <div className="filter-row">
            {FILTERS.map(f => (
              <button key={f.value} className={`filter-pill${filterType === f.value ? ' active' : ''}`}
                onClick={() => setFilterType(f.value)} type="button">
                {f.label}{counts[f.value] > 0 && <span className="filter-count">{counts[f.value]}</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="cards-grid">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              {query ? (
                <><div className="empty-icon"><IconSearch /></div><p className="empty-title">Nenhum resultado para "{query}"</p><p className="empty-sub">Tente palavras-chave diferentes ou limpe a pesquisa</p></>
              ) : (
                <><div className="empty-icon"><IconBrain /></div><p className="empty-title">Seu memory depo está vazio</p><p className="empty-sub">Comece a capturar notas, ideias, links e trechos acima</p>
                  <button className="empty-cta" onClick={() => textareaRef.current?.focus()} type="button">Criar primeira memória</button></>
              )}
            </div>
          ) : (
            <>
              {pinnedItems.length > 0 && (
                <section className="section">
                  <div className="section-label-row"><IconPin small /><span>Fixados</span></div>
                  <div className="cards-grid">
                    {pinnedItems.map(item => <BrainCard key={item.id} item={item} copiedId={copiedId} onPin={togglePin} onDelete={handleDelete} onCopy={copyItem} onEdit={editItem} />)}
                  </div>
                </section>
              )}
              {unpinnedItems.length > 0 && (
                <section className="section">
                  {pinnedItems.length > 0 && <div className="section-label-row"><span>Recentes</span></div>}
                  <div className="cards-grid">
                    {unpinnedItems.map(item => <BrainCard key={item.id} item={item} copiedId={copiedId} onPin={togglePin} onDelete={handleDelete} onCopy={copyItem} onEdit={editItem} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <Modal open={!!modalConfig} title={modalConfig?.title} message={modalConfig?.message}
        confirmLabel={modalConfig?.confirmLabel} cancelLabel={modalConfig?.cancelLabel}
        tone={modalConfig?.tone} onConfirm={modalConfig?.onConfirm} onCancel={modalConfig?.onCancel} />
      {focusEditorOpen && (
        <div className="focus-editor-overlay" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setFocusEditorOpen(false)
        }}>
          <section className="focus-editor-dialog" role="dialog" aria-modal="true" aria-label="Editor em foco">
            <div className="focus-editor-header">
              <div>
                <p className="focus-editor-kicker">{editingId ? 'Editando' : 'Nova memoria'} / {meta.label}</p>
                <h2 className="focus-editor-title">Editor em foco</h2>
              </div>
              <button className="card-btn focus-close-btn" onClick={() => setFocusEditorOpen(false)}
                type="button" aria-label="Fechar editor em foco" title="Fechar editor em foco">
                <IconX />
              </button>
            </div>
            <textarea ref={focusTextareaRef} className="focus-editor-textarea"
              value={formContent} onChange={e => setFormContent(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addOrUpdateFromFocus() }}
              aria-label="Conteudo em foco" />
            <div className="focus-editor-footer">
              <span className="focus-editor-count">{formContent.trim().length} caracteres</span>
              <div className="focus-editor-actions">
                <button className="ghost-btn" onClick={() => setFocusEditorOpen(false)} type="button">Concluir</button>
                <button className="btn-primary" onClick={addOrUpdateFromFocus} disabled={!hasDraft} type="button">
                  {editingId ? 'Salvar alteracoes' : 'Adicionar'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function SkeletonCard() {
  return (
    <div className="brain-card skeleton-card">
      <div className="card-accent skeleton-accent" />
      <div className="card-main">
        <div className="skeleton-line skeleton-line-full" />
        <div className="skeleton-line skeleton-line-wide" />
        <div className="skeleton-line skeleton-line-medium" />
        <div className="skeleton-tags"><span className="skeleton-tag" /><span className="skeleton-tag" /></div>
      </div>
      <div className="card-footer"><div className="skeleton-line skeleton-line-short" /></div>
    </div>
  )
}

function BrainCard({ item, copiedId, onPin, onDelete, onCopy, onEdit }) {
  const meta = TYPE_META[item.type]
  const isCopied = copiedId === item.id
  const [expanded, setExpanded] = useState(false)
  const content = item.content || ''
  const lineCount = content.split('\n').length
  const canExpand = content.length > CARD_PREVIEW_LIMIT || lineCount > CARD_PREVIEW_LINES
  const contentClassName = [
    'card-content',
    item.type === 'snippet' ? 'mono' : '',
    canExpand ? (expanded ? 'is-expanded' : 'is-collapsed') : '',
  ].filter(Boolean).join(' ')
  return (
    <div className="brain-card" style={{ '--card-color': meta.color, '--card-dim': meta.dim, '--card-border': meta.border }}>
      <div className="card-accent" />
      <div className="card-main">
        {item.imageData && <img className="card-image" src={item.imageData} alt="Imagem anexada a memoria" loading="lazy" />}
        {content && <div className={contentClassName}>{content}</div>}
        {canExpand && (
          <button className="card-expand-btn" onClick={() => setExpanded(value => !value)}
            type="button" aria-expanded={expanded} aria-label={expanded ? 'Recolher ideia' : 'Ver ideia completa'}>
            {expanded ? <IconChevronUp /> : <IconChevronDown />}
            {expanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}
        {item.url && (
          <a href={item.url} className="card-url" target="_blank" rel="noopener noreferrer">
            <IconLink /><span className="card-url-text">{item.url}</span>
          </a>
        )}
        {item.tags.length > 0 && (
          <div className="card-tags">{item.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
        )}
      </div>
      <div className="card-footer">
        <span className="card-meta"><span className="card-type-dot" style={{ background: meta.color }} />{meta.label} · {formatRelative(item.updatedAt ?? item.createdAt)}</span>
        <div className="card-actions">
          <button className="card-btn" onClick={() => onEdit(item)} aria-label="Editar" title="Editar" type="button"><IconEdit /></button>
          <button className={`card-btn${isCopied ? ' success' : ''}`} onClick={() => onCopy(item)} aria-label={isCopied ? 'Copiado' : 'Copiar'} title="Copiar" type="button">
            {isCopied ? <IconCheck /> : <IconCopy />}
          </button>
          <button className={`card-btn${item.pinned ? ' active' : ''}`} onClick={() => onPin(item.id)} aria-label={item.pinned ? 'Desafixar' : 'Fixar'} title={item.pinned ? 'Desafixar' : 'Fixar'} type="button"><IconPin /></button>
          <button className="card-btn danger" onClick={() => onDelete(item.id)} aria-label="Excluir" title="Excluir" type="button"><IconTrash /></button>
        </div>
      </div>
    </div>
  )
}
