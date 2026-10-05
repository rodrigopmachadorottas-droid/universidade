import React, { useState } from 'react'
import { DOMINIO, configurado, supabase } from '../lib/supabase'
import { Icon } from '../ui'

/*
  Modo de login:
  - VITE_LOGIN_MODO=email      -> só código por e-mail (sem seletor)
  - VITE_LOGIN_MODO=microsoft  -> só Microsoft (sem seletor)
  - não definido               -> mostra o seletor de pré-visualização entre as duas versões
*/
type Modo = 'email' | 'microsoft'
const FIXO = (import.meta.env.VITE_LOGIN_MODO as Modo | undefined) || null

export default function Login() {
  const [modo, setModoState] = useState<Modo>(() => {
    if (FIXO) return FIXO
    try { return (localStorage.getItem('ur-login-v') as Modo) || 'email' } catch { return 'email' }
  })
  const setModo = (m: Modo) => { setModoState(m); try { localStorage.setItem('ur-login-v', m) } catch {} }

  return (
    <div className="lg">
      <section className="lg-hero">
        <div className="lg-brand">Universidade Rottas</div>
        <div className="lg-pitch">
          <span className="lg-eyebrow">O que você vai encontrar</span>
          <h1>Os treinamentos da Rottas, num só lugar.</h1>
          <p>Assista quando puder, tire suas dúvidas e acompanhe o que já concluiu.</p>
        </div>
        <Vitrine />
      </section>

      <section className="lg-side">
        {!FIXO && (
          <div className="lg-preview" role="group" aria-label="Versão da tela de login (pré-visualização)">
            <span>Versão</span>
            <button className={modo === 'email' ? 'on' : ''} onClick={() => setModo('email')}>Código por e-mail</button>
            <button className={modo === 'microsoft' ? 'on' : ''} onClick={() => setModo('microsoft')}>Microsoft</button>
          </div>
        )}
        <div className="lg-form">
          {modo === 'email' ? <LoginEmail /> : <LoginMicrosoft />}
          {!configurado && <div className="err">Falta configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja o LEIA-ME).</div>}
          <p className="lg-help">Problemas para entrar? Fale com a Excelência Operacional.</p>
        </div>
      </section>
    </div>
  )
}

function LoginEmail() {
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setErro('')
    const em = email.trim().toLowerCase()
    if (!em.endsWith('@' + DOMINIO)) { setErro(`Use seu e-mail @${DOMINIO}.`); return }
    setEnviando(true)
    const { error } = await supabase.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true } })
    setEnviando(false)
    if (error) { setErro(traduz(error.message)); return }
    setEmail(em); setEtapa('codigo')
  }
  async function verificar(e: React.FormEvent) {
    e.preventDefault(); setErro(''); setEnviando(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo.trim(), type: 'email' })
    setEnviando(false)
    if (error) setErro('Código inválido ou expirado. Confira o e-mail mais recente ou peça um novo código.')
  }

  if (etapa === 'codigo') return (
    <form onSubmit={verificar} className="lg-stack">
      <button type="button" className="lg-back" onClick={() => { setEtapa('email'); setCodigo(''); setErro('') }}><Icon n="left" s={16} /> Voltar</button>
      <div><h2>Digite o código</h2><p className="lg-sub">Enviamos 6 dígitos para <b>{email}</b>. Pode levar 1 minuto; confira também o spam.</p></div>
      <div className="field"><label htmlFor="lg-cod">Código</label>
        <input className="lg-in code-in" id="lg-cod" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus
          value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} /></div>
      {erro && <div className="err">{erro}</div>}
      <button className="lg-btn" type="submit" disabled={enviando || codigo.length < 6}><Icon n="enter" /> {enviando ? 'Conferindo…' : 'Entrar'}</button>
    </form>
  )
  return (
    <form onSubmit={enviar} className="lg-stack">
      <div><h2>Faça seu login</h2><p className="lg-sub">Use seu e-mail corporativo. Enviaremos um código de acesso.</p></div>
      <div className="field"><label htmlFor="lg-em">E-mail</label>
        <input className="lg-in" id="lg-em" type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder={`nome.sobrenome@${DOMINIO}`} /></div>
      {erro && <div className="err">{erro}</div>}
      <button className="lg-btn" type="submit" disabled={enviando}><Icon n="enter" /> {enviando ? 'Enviando…' : 'Receber código'}</button>
      <div className="lg-div"><span>Primeiro acesso?</span></div>
      <p className="lg-note">Não precisa criar conta. Entre com o seu e-mail @{DOMINIO} e o cadastro é feito na hora.</p>
    </form>
  )
}

function LoginMicrosoft() {
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)
  async function entrar() {
    setErro(''); setIndo(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { scopes: 'email openid profile', redirectTo: window.location.origin },
    })
    if (error) {
      setIndo(false)
      setErro(/provider is not enabled|Unsupported provider/i.test(error.message)
        ? 'O login com Microsoft ainda não foi ativado. Use a versão com código por e-mail.'
        : error.message)
    }
  }
  return (
    <div className="lg-stack">
      <div><h2>Faça seu login</h2><p className="lg-sub">Entre com a sua conta Microsoft da Rottas, a mesma do Teams e do Outlook.</p></div>
      <button className="lg-ms" onClick={entrar} disabled={indo}>
        <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#F25022" /><rect x="11" y="1" width="9" height="9" fill="#7FBA00" /><rect x="1" y="11" width="9" height="9" fill="#00A4EF" /><rect x="11" y="11" width="9" height="9" fill="#FFB900" /></svg>
        {indo ? 'Abrindo a Microsoft…' : 'Entrar com Microsoft'}
      </button>
      {erro && <div className="err">{erro}</div>}
      <div className="lg-div"><span>Primeiro acesso?</span></div>
      <p className="lg-note">Não precisa criar conta nem senha nova. O acesso usa o seu login da empresa, e o cadastro é feito na primeira entrada.</p>
    </div>
  )
}

/* vitrine ilustrativa do lado laranja (dados de exemplo, só visual) */
function Vitrine() {
  const itens = [
    { t: 'Como lançar uma medição de contrato', m: 'Vídeo · 6 min', s: 'ok', l: 'Aprovado · 100%' },
    { t: 'Solicitando um aditivo contratual', m: 'Vídeo · 5 min', s: 'warn', l: 'Falta o questionário' },
    { t: 'Cadastro de fornecedor no ERP', m: 'PDF · 6 págs.', s: 'neutral', l: 'Novo' },
  ]
  return (
    <div className="lg-show" aria-hidden="true">
      <div className="lg-win">
        <div className="lg-win-top"><span className="lg-win-path"><Icon n="trail" s={14} /> <b>Engenharia</b> · ERP</span><span className="lg-win-tag">trilha</span></div>
        <div className="lg-win-body">
          {itens.map((x) => (
            <div className="lg-row" key={x.t}>
              <span className="lg-thumb"><Icon n={x.m.startsWith('PDF') ? 'pdf' : 'video'} s={16} /></span>
              <div><b>{x.t}</b><small>{x.m}</small></div>
              <span className={'pill ' + x.s}>{x.l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="lg-quiz">
        <div className="lg-quiz-top"><span>Questionário</span><span>2 de 5</span></div>
        <b>Quem aprova a medição depois do lançamento?</b>
        <div className="lg-opt">O fornecedor</div>
        <div className="lg-opt on">O gestor da obra</div>
        <div className="lg-opt">O financeiro</div>
        <div className="lg-quiz-bot"><small>mín. 70%</small><span>Próxima</span></div>
      </div>
    </div>
  )
}

function traduz(m: string) {
  if (/rate limit|security purposes/i.test(m)) return 'Muitos pedidos de código seguidos. Espere 1 minuto e tente de novo.'
  if (/Database error/i.test(m)) return `Não foi possível criar seu acesso. Use seu e-mail @${DOMINIO}.`
  return m
}
