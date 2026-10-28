import { useEffect, useRef, useState } from 'react'

export default function InstallApp() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true)
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef(null)
  const buttonRef = useRef(null)
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  useEffect(() => {
    const media = window.matchMedia?.('(display-mode: standalone)')
    const onPrompt = (event) => { event.preventDefault(); setPrompt(event) }
    const onInstalled = () => { setInstalled(true); setPrompt(null); dialogRef.current?.close() }
    const onDisplay = () => setInstalled(media.matches || navigator.standalone === true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    media?.addEventListener('change', onDisplay)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      media?.removeEventListener('change', onDisplay)
    }
  }, [])

  async function install() {
    if (!prompt) { dialogRef.current?.showModal(); return }
    setBusy(true)
    try {
      await prompt.prompt()
      const result = await prompt.userChoice
      if (result.outcome === 'accepted') setInstalled(true)
    } catch {
      dialogRef.current?.showModal()
    } finally {
      setPrompt(null)
      setBusy(false)
    }
  }

  if (installed) return null
  return (
    <div className="install-app">
      <button ref={buttonRef} className="install-button" type="button" onClick={install} disabled={busy}>
        {busy ? 'Abrindo instalação…' : 'Instalar aplicativo'}
      </button>
      <dialog ref={dialogRef} className="install-dialog" aria-labelledby="install-title" onClose={() => buttonRef.current?.focus()}>
        <h2 id="install-title">Memory Depo no seu celular</h2>
        {ios ? (
          <p>No Safari, abra Compartilhar e escolha “Adicionar à Tela de Início”. Se aparecer “Abrir como App”, mantenha a opção ativada e toque em “Adicionar”.</p>
        ) : (
          <p>No Chrome ou Edge, abra o menu do navegador e procure “Instalar aplicativo” ou “Adicionar à tela inicial”. No computador, procure também o ícone de instalação na barra de endereço. Se a opção não aparecer, abra este site diretamente em um navegador compatível.</p>
        )}
        <p>O aplicativo precisa de internet para acessar e sincronizar suas memórias.</p>
        <form method="dialog"><button className="install-button" autoFocus>Entendi</button></form>
      </dialog>
    </div>
  )
}
