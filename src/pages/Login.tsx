import React, { useState } from 'react'
import { DOMINIO, configurado, supabase } from '../lib/supabase'

export default function Login() {
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
    e.preventDefault(); setErro('')
    setEnviando(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo.trim(), type: 'email' })
    setEnviando(false)
    if (error) setErro('Código inválido ou expirado. Confira o e-mail mais recente ou peça um novo código.')
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand">
          <img className="brand-mark" src="/logo.png" alt="" />
          <div><b>Universidade Rottas</b><span>Rottas Construtora</span></div>
        </div>
        {!configurado && <div className="err">Falta configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja o LEIA-ME).</div>}
        {etapa === 'email' ? (
          <form onSubmit={enviar}>
            <div><h2>Entrar</h2><p className="muted" style={{ margin: '4px 0 0' }}>Enviaremos um código de 6 dígitos para o seu e-mail da empresa.</p></div>
            <div className="field"><label htmlFor="em">E-mail</label>
              <input className="in" id="em" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`nome.sobrenome@${DOMINIO}`} /></div>
            {erro && <div className="err">{erro}</div>}
            <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Receber código'}</button>
          </form>
        ) : (
          <form onSubmit={verificar}>
            <div><h2>Digite o código</h2><p className="muted" style={{ margin: '4px 0 0' }}>Enviado para <b>{email}</b>. Pode levar 1 minuto. Confira também a caixa de spam.</p></div>
            <input className="in code-in" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} aria-label="Código de 6 dígitos" />
            {erro && <div className="err">{erro}</div>}
            <button className="btn" type="submit" disabled={enviando || codigo.length < 6}>{enviando ? 'Conferindo…' : 'Entrar'}</button>
            <button className="btn ghost" type="button" onClick={() => { setEtapa('email'); setCodigo(''); setErro('') }}>Usar outro e-mail</button>
          </form>
        )}
      </div>
    </div>
  )
}

function traduz(m: string) {
  if (/rate limit|security purposes/i.test(m)) return 'Muitos pedidos de código seguidos. Espere 1 minuto e tente de novo.'
  if (/Database error/i.test(m)) return `Não foi possível criar seu acesso. Use seu e-mail @${DOMINIO}.`
  return m
}
