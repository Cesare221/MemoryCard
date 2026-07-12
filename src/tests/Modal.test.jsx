import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../components/Modal.jsx'

describe('Modal', () => {
  it('renders nothing when not open', () => {
    const { container } = render(<Modal open={false} title="Test" message="msg" />)
    expect(container.querySelector('.modal-overlay')).toBeNull()
  })

  it('renders content when open', () => {
    render(<Modal open={true} title="Confirmar" message="Tem certeza?" confirmLabel="Sim" />)
    expect(screen.getByText('Confirmar')).toBeInTheDocument()
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument()
    expect(screen.getByText('Sim')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(<Modal open={true} title="Test" message="msg" confirmLabel="OK" onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('OK'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(<Modal open={true} title="Test" message="msg" confirmLabel="OK" cancelLabel="Cancelar" onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('closes on backdrop click when onCancel is provided', () => {
    const onCancel = vi.fn()
    const { container } = render(<Modal open={true} title="Test" message="msg" confirmLabel="OK" onCancel={onCancel} />)
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn()
    render(<Modal open={true} title="Test" message="msg" confirmLabel="OK" onCancel={onCancel} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('applies danger class for danger tone', () => {
    render(<Modal open={true} title="Test" message="msg" confirmLabel="Excluir" tone="danger" />)
    const btn = screen.getByText('Excluir')
    expect(btn.classList.contains('danger')).toBe(true)
  })
})
