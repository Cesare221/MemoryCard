import { useEffect, useRef, useState, useCallback } from 'react'
import { sendPasswordReset } from '../services/authService.js'

export default function LoginScreen({
  mode,
  onSubmit,
  onPasswordUpdate,
  onSwitchMode,
  loading,
  error,
  registeredEmail,
  passwordResetMode,
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isOn, setIsOn] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const cordBeadRef = useRef(null)
  const cordLineRef = useRef(null)
  const hitAreaRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    const hitArea = hitAreaRef.current
    const cordBead = cordBeadRef.current
    const cordLine = cordLineRef.current
    if (!hitArea || !cordBead || !cordLine) return

    let startY = 0
    let currentY = 0
    let isDragging = false
    let animFrame = null

    function resetPosition(animate) {
      if (animFrame) cancelAnimationFrame(animFrame)
      if (animate) {
        cordBead.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        cordLine.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }
      cordBead.style.transform = 'translateY(0)'
      cordLine.setAttribute('y2', 180)
      if (animate) {
        setTimeout(() => {
          cordBead.style.transition = ''
          cordLine.style.transition = ''
        }, 500)
      }
    }

    function toggleLamp() {
      setIsOn((prev) => !prev)
    }

    function getClientY(e) {
      return e.touches ? e.touches[0].clientY : e.clientY
    }

    function onPointerDown(e) {
      isDragging = true
      startY = getClientY(e)
      currentY = 0
      cordBead.style.transition = ''
      cordLine.style.transition = ''
    }

    function onPointerMove(e) {
      if (!isDragging) return
      const clientY = getClientY(e)
      currentY = Math.max(0, Math.min(60, clientY - startY))
      cordBead.style.transform = `translateY(${currentY}px)`
      cordLine.setAttribute('y2', 180 + currentY)
    }

    function onPointerUp() {
      if (!isDragging) return
      isDragging = false
      if (currentY > 30) toggleLamp()
      resetPosition(true)
    }

    hitArea.addEventListener('mousedown', onPointerDown)
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup', onPointerUp)
    hitArea.addEventListener('touchstart', onPointerDown, { passive: true })
    window.addEventListener('touchmove', onPointerMove, { passive: true })
    window.addEventListener('touchend', onPointerUp)

    return () => {
      hitArea.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup', onPointerUp)
      hitArea.removeEventListener('touchstart', onPointerDown)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('touchend', onPointerUp)
      if (animFrame) cancelAnimationFrame(animFrame)
    }
  }, [])

  useEffect(() => {
    if (isOn) {
      formRef.current?.classList.add('active')
    } else {
      formRef.current?.classList.remove('active')
    }
  }, [isOn])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--on', isOn ? '1' : '0')
  }, [isOn])

  const handleCordKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOn((prev) => !prev)
    }
  }, [])

  const handleSubmit = useCallback((event) => {
    event.preventDefault()
    onSubmit({ email, password, name })
  }, [email, password, name, onSubmit])

  const handleResetPassword = useCallback(async (event) => {
    event.preventDefault()
    setResetLoading(true)
    setResetError('')
    try {
      await sendPasswordReset({ email })
      setResetSent(true)
    } catch (err) {
      setResetError(err.message)
    } finally {
      setResetLoading(false)
    }
  }, [email])

  const handleSwitchMode = useCallback((newMode) => {
    setResetMode(false)
    setResetSent(false)
    setResetError('')
    onSwitchMode(newMode)
  }, [onSwitchMode])

  if (registeredEmail) {
    return (
      <div className="auth-page" data-on={isOn ? 'true' : 'false'}>
        <div className="auth-card">
          <div className="lamp-wrapper">
            <svg className="lamp-svg" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
              <ellipse className="inner-glow" cx="100" cy="110" rx="60" ry="30" />
              <rect className="lamp-base" x="92" y="100" width="16" height="160" rx="8" />
              <rect className="lamp-base" x="60" y="250" width="80" height="12" rx="6" />
              <g className="pull-cord">
                <line className="cord-line" x1="130" y1="110" x2="130" y2="180" />
                <circle className="cord-bead" cx="130" cy="190" r="6" />
                <circle className="cord-hit" cx="130" cy="190" r="25" fill="transparent" tabIndex={0} role="button" aria-label="Puxar cordão" onKeyDown={handleCordKeyDown} />
              </g>
              <path className="lamp-shade" d="M30 110 C 30 50, 170 50, 170 110 C 170 125, 30 125, 30 110 Z" />
            </svg>
          </div>
          <div className="login-form active">
            <h2>Confirme seu e-mail</h2>
            <p className="auth-subtitle">
              Enviamos um link de confirmação para <strong>{registeredEmail}</strong>.
              Verifique sua caixa de entrada e spam, depois acesse o link para ativar sua conta.
            </p>
            <button className="login-btn" type="button" onClick={() => handleSwitchMode('signin')}>
              Voltar para o login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (passwordResetMode) {
    return (
      <div className="auth-page active" data-on="true">
        <div className="auth-card">
          <div className="lamp-wrapper">
            <svg className="lamp-svg" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
              <ellipse className="inner-glow" cx="100" cy="110" rx="60" ry="30" />
              <rect className="lamp-base" x="92" y="100" width="16" height="160" rx="8" />
              <rect className="lamp-base" x="60" y="250" width="80" height="12" rx="6" />
              <g className="pull-cord">
                <line className="cord-line" x1="130" y1="110" x2="130" y2="180" />
                <circle className="cord-bead" cx="130" cy="190" r="6" />
                <circle className="cord-hit" cx="130" cy="190" r="25" fill="transparent" tabIndex={0} role="button" aria-label="Puxar cordão" onKeyDown={handleCordKeyDown} />
              </g>
              <path className="lamp-shade" d="M30 110 C 30 50, 170 50, 170 110 C 170 125, 30 125, 30 110 Z" />
            </svg>
          </div>
          <div className="login-form active">
            <h2>Redefinir senha</h2>
            <p className="auth-subtitle">Escolha uma nova senha para sua conta.</p>
            <form onSubmit={(e) => { e.preventDefault(); onPasswordUpdate({ password }) }} className="auth-form">
              <div className="form-group">
                <label htmlFor="new-password">Nova senha</label>
                <input id="new-password" type="password" placeholder="Digite a nova senha" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={6} />
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button className="login-btn" type="submit" disabled={loading || !password.trim()}>
                {loading ? 'Atualizando...' : 'Atualizar senha'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page" data-on={isOn ? 'true' : 'false'}>
      <div className="auth-card">
        <div className="lamp-wrapper">
          <svg className="lamp-svg" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
            <ellipse className="inner-glow" cx="100" cy="110" rx="60" ry="30" />
            <rect className="lamp-base" x="92" y="100" width="16" height="160" rx="8" />
            <rect className="lamp-base" x="60" y="250" width="80" height="12" rx="6" />
            <g className="pull-cord">
              <line ref={cordLineRef} className="cord-line" x1="130" y1="110" x2="130" y2="180" />
              <circle ref={cordBeadRef} className="cord-bead" cx="130" cy="190" r="6" />
              <circle ref={hitAreaRef} className="cord-hit" cx="130" cy="190" r="25" fill="transparent" tabIndex={0} role="button" aria-label="Puxar cordão" onKeyDown={handleCordKeyDown} />
            </g>
            <path className="lamp-shade" d="M30 110 C 30 50, 170 50, 170 110 C 170 125, 30 125, 30 110 Z" />
          </svg>
          <p className="lamp-hint">Puxe o cordão para acender</p>
        </div>

        <div ref={formRef} className="login-form">
          {resetMode ? (
            resetSent ? (
              <>
                <h2>E-mail enviado</h2>
                <p className="auth-subtitle">
                  Se existir uma conta para <strong>{email}</strong>, você receberá um link de recuperação de senha.
                </p>
                <button className="login-btn" type="button" onClick={() => { setResetMode(false); setResetSent(false); setResetError('') }}>
                  Voltar ao login
                </button>
              </>
            ) : (
              <>
                <h2>Recuperar senha</h2>
                <p className="auth-subtitle">Digite seu e-mail para receber um link de recuperação.</p>
                <form onSubmit={handleResetPassword} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="reset-email">E-mail</label>
                    <input id="reset-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                  </div>
                  {resetError && <p className="auth-error">{resetError}</p>}
                  <button className="login-btn" type="submit" disabled={resetLoading}>
                    {resetLoading ? 'Enviando...' : 'Enviar link'}
                  </button>
                </form>
                <button className="auth-toggle" type="button" onClick={() => { setResetMode(false); setResetError('') }}>
                  Voltar ao login
                </button>
              </>
            )
          ) : (
            <>
              <h2>{mode === 'signup' ? 'Criar conta' : 'Bem-vindo'}</h2>
              <p className="auth-subtitle">
                {mode === 'signup' ? 'Crie sua conta para salvar ideias em um lugar seguro.' : 'Puxe o cordão e acesse seu memory depo.'}
              </p>
              <form onSubmit={handleSubmit} className="auth-form">
                {mode === 'signup' && (
                  <div className="form-group">
                    <label htmlFor="name">Nome</label>
                    <input id="name" type="text" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="email">E-mail</label>
                  <input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Senha</label>
                  <input id="password" type="password" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
                </div>
                {mode === 'signin' && (
                  <button type="button" className="forgot-link" onClick={() => setResetMode(true)}>Esqueci minha senha</button>
                )}
                {error && <p className="auth-error">{error}</p>}
                <button className="login-btn" type="submit" disabled={loading}>
                  {loading ? 'Aguarde...' : mode === 'signup' ? 'Criar conta' : 'Entrar'}
                </button>
              </form>
              <button className="auth-toggle" type="button" onClick={() => handleSwitchMode(mode === 'signup' ? 'signin' : 'signup')}>
                {mode === 'signup' ? 'Já tenho conta' : 'Criar conta'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
