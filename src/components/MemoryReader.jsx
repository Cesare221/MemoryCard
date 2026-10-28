import { useEffect, useRef } from 'react'

export default function MemoryReader({ item, onClose, onEdit }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!item) return
    const previous = document.activeElement
    ref.current.showModal()
    return () => { ref.current?.close(); previous?.focus() }
  }, [item])
  if (!item) return null
  return (
    <dialog ref={ref} className="memory-reader" aria-label="Ler memória" onCancel={onClose} onClick={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="reader-inner">
        <header><h2> Sua memória </h2><button className="ghost-btn" onClick={onClose} autoFocus>Fechar</button></header>
        {item.imageData && <img src={item.imageData} alt="Imagem da memória" />}
        <div className={`reader-content${item.type === 'snippet' ? ' mono' : ''}`}>{item.content}</div>
        {item.url && <a href={/^https?:\/\//i.test(item.url) ? item.url : undefined} target="_blank" rel="noopener noreferrer">{item.url}</a>}
        <div className="card-tags">{item.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
        <footer><button className="btn-primary" onClick={() => { onClose(); onEdit(item) }}>Editar memória</button></footer>
      </div>
    </dialog>
  )
}
