import { useEffect, useRef } from 'react'

export default function Modal({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, tone }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()

    const handler = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className={`modal-dialog${tone === 'danger' ? ' danger' : ''}`} onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {message && <p className="modal-message">{message}</p>}
        <div className="modal-actions">
          <button className="modal-btn modal-btn-secondary" onClick={onCancel} type="button">
            {cancelLabel || 'Cancelar'}
          </button>
          <button ref={confirmRef} className={`modal-btn modal-btn-primary${tone === 'danger' ? ' danger' : ''}`} onClick={onConfirm} type="button">
            {confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
