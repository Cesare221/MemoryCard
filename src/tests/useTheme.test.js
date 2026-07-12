import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../hooks/useTheme.js'

const store = {}

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val }),
    removeItem: vi.fn((key) => { delete store[key] }),
  })
  document.documentElement.removeAttribute('data-theme')
})

describe('useTheme', () => {
  it('defaults to dark theme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('sets data-theme attribute on root element', () => {
    renderHook(() => useTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('persists theme to localStorage', () => {
    renderHook(() => useTheme())
    expect(store['memory-depo-theme']).toBe('dark')
  })

  it('toggles theme', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(store['memory-depo-theme']).toBe('light')
  })

  it('loads persisted theme from localStorage', () => {
    store['memory-depo-theme'] = 'light'
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })
})
