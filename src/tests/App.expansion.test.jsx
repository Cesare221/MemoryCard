import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App.jsx'

const longIdea = Array.from({ length: 18 }, (_, i) => `Linha ${i + 1} da ideia com detalhes importantes.`).join('\n')

vi.mock('../lib/supabaseClient.js', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))

vi.mock('../services/authService.js', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  tryRestoreSession: () => ({ id: 'user-1', email: 'ana@example.com' }),
  isMigrationDone: () => true,
  markMigrationDone: vi.fn(),
  detectLegacyItems: () => [],
  clearLegacyStorage: vi.fn(),
  updatePassword: vi.fn(),
}))

vi.mock('../services/memoryService.js', () => ({
  createItem: vi.fn(),
  deleteItem: vi.fn(),
  normalizeItems: (items) => items,
}))

vi.mock('../hooks/useTheme.js', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const addItem = vi.fn()
const updateItem = vi.fn()

vi.mock('../hooks/useMemories.js', () => ({
  useMemories: () => ({
    items: [
      {
        id: 'idea-1',
        type: 'idea',
        content: longIdea,
        url: '',
        tags: ['produto'],
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    setItems: vi.fn(),
    syncStatus: 'synced',
    recentlyDeleted: null,
    pendingCount: 0,
    addItem,
    deleteItem: vi.fn(),
    undoDelete: vi.fn(),
    updateItem,
    loadItems: vi.fn(),
    saveLocalCache: vi.fn(),
  }),
}))

describe('App long content affordances', () => {
  beforeEach(() => {
    addItem.mockClear()
    updateItem.mockClear()
  })

  it('collapses long cards and lets the user expand them', async () => {
    render(<App />)

    const content = await screen.findByText(/Linha 1 da ideia/)
    expect(content).toHaveClass('is-collapsed')

    fireEvent.click(screen.getByRole('button', { name: 'Ver ideia completa' }))
    expect(content).toHaveClass('is-expanded')
    expect(screen.getByRole('button', { name: 'Recolher ideia' })).toBeInTheDocument()
  })

  it('opens a focus editor for long writing and keeps the same content', async () => {
    render(<App />)

    const textarea = (await screen.findAllByRole('textbox')).find((field) => field.tagName === 'TEXTAREA')
    fireEvent.change(textarea, { target: { value: 'Uma ideia que precisa de espaco para respirar.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir editor em foco' }))

    const focusEditor = screen.getByLabelText('Conteudo em foco')
    expect(focusEditor).toHaveValue('Uma ideia que precisa de espaco para respirar.')

    fireEvent.change(focusEditor, { target: { value: 'Ideia revisada no modo foco.' } })
    expect(textarea).toHaveValue('Ideia revisada no modo foco.')

    fireEvent.click(screen.getByRole('button', { name: 'Fechar editor em foco' }))
    expect(screen.queryByRole('dialog', { name: 'Editor em foco' })).toBeNull()
  })
})
