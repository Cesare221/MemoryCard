export default function ActionMenu({ label = 'Mais opções', children }) {
  return (
    <details className="action-menu" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
    }} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.currentTarget.open = false
        event.currentTarget.querySelector('summary')?.focus()
      }
    }}>
      <summary aria-label={label}>{label === 'Mais opções' ? <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg> : label}</summary>
      <div className="action-menu-panel" onClick={(event) => {
        if (event.target.closest('button')) event.currentTarget.closest('details').open = false
      }}>{children}</div>
    </details>
  )
}
