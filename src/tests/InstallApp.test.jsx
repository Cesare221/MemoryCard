import { fireEvent, render, screen, act } from '@testing-library/react'
import { vi, beforeEach, afterEach, test, expect } from 'vitest'
import InstallApp from '../components/InstallApp.jsx'

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  HTMLDialogElement.prototype.showModal = vi.fn(function () { this.setAttribute('open', '') })
  HTMLDialogElement.prototype.close = vi.fn(function () { this.removeAttribute('open') })
})
afterEach(() => vi.unstubAllGlobals())

function offer(outcome = 'accepted', rejects = false) {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  event.prompt = rejects ? vi.fn().mockRejectedValue(new Error('unavailable')) : vi.fn().mockResolvedValue()
  event.userChoice = Promise.resolve({ outcome })
  act(() => window.dispatchEvent(event))
  return event
}

test('provides instructions when a native prompt is unavailable', () => {
  render(<InstallApp />)
  fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicativo' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByText(/precisa de internet/)).toBeVisible()
})

test('offers iPhone home-screen instructions', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone')
  render(<InstallApp />)
  fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicativo' }))
  expect(screen.getByText(/No Safari, abra Compartilhar/)).toBeVisible()
  vi.restoreAllMocks()
})

test('uses a user gesture to install and hides after acceptance', async () => {
  render(<InstallApp />)
  const event = offer()
  expect(event.defaultPrevented).toBe(true)
  expect(event.prompt).not.toHaveBeenCalled()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicativo' })))
  expect(event.prompt).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: 'Instalar aplicativo' })).not.toBeInTheDocument()
})

test('keeps instructions available after dismissal, without reusing the prompt', async () => {
  render(<InstallApp />)
  const event = offer('dismissed')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicativo' })))
  fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicativo' }))
  expect(event.prompt).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('dialog')).toBeVisible()
})

test('falls back to instructions if the native prompt fails', async () => {
  render(<InstallApp />)
  offer('dismissed', true)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicativo' })))
  expect(screen.getByRole('dialog')).toBeVisible()
})

test('hides installation UI when opened as an installed app', () => {
  window.matchMedia.mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  render(<InstallApp />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
