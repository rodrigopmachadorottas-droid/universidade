import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from './lib/store'
import { supabase } from './lib/supabase'
import { Avatar, Icon, Modal } from './ui'

export default function Layout() {
  const st = useStore()
  const { profile, isAdmin, conteudos, isPend, pendDuvidas, setores } = st
  const [menu, setMenu] = useState(false)
  const [perfil, setPerfil] = useState(false)
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const loc = useLocation()

  useEffect(() => { setMenu(false) }, [loc.pathname])
  useEffect(() => {
    const f = () => setMenu(false)
    if (menu) window.addEventListener('click', f)
    return () => window.removeEventListener('click', f)
  }, [menu])

  const precisaCadastro = profile && !profile.setor_id
  const pend = conteudos.filter(isPend).length
  const item = (to: string, n: string, i: string, count?: number, end?: boolean) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'on' : '')}>
      <Icon n={i} /><span>{n}</span>{count ? <span className="count">{count}</span> : null}
    </NavLink>
  )
  const setor = setores.find((s) => s.id === profile?.setor_id)?.nome

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <img className="brand-mark" src="/logo.png" alt="Universidade Rottas" />
          <div><b>Universidade Rottas</b><span>Rottas Construtora</span></div>
        </div>
        <nav className="nav">
          <div className="nav-label">Aprender</div>
          {item('/', 'Início', 'home', 0, true)}
          {item('/trilhas', 'Trilhas', 'trail')}
          {item('/duvidas', 'Dúvidas', 'chat', isAdmin ? pendDuvidas : 0)}
          {item('/pendentes', 'Meus pendentes', 'check', pend)}
          {isAdmin && <>
            <div className="nav-label">Gestão</div>
            {item('/painel', 'Painel gerencial', 'chart')}
            {item('/gerenciar', 'Gerenciar conteúdo', 'edit')}
          </>}
        </nav>
        <div className="side-foot">Excelência Operacional · Rottas</div>
      </aside>
      <div className="main">
        <header className="top">
          <form className="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav('/busca?q=' + encodeURIComponent(q.trim())) }}>
            <Icon n="search" s={16} />
            <input id="gsearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conteúdo, tag ou código POP… (ex.: aditivo)" autoComplete="off" />
          </form>
          {profile?.is_admin && !isAdmin && <button className="viewas" onClick={() => setPerfil(true)}>Visualizando como colaborador</button>}
          <button className="user" onClick={(e) => { e.stopPropagation(); setMenu(!menu) }} aria-haspopup="true">
            <Avatar nome={profile?.nome} url={profile?.avatar_url} />
            <div><b>{profile?.nome}</b><small>{setor || 'Complete seu cadastro'}</small></div>
          </button>
        </header>
        {menu && (
          <div className="menu" role="menu" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 10 }}>
              <b>{profile?.nome}</b>
              <div className="muted" style={{ fontSize: 12 }}>{profile?.email}</div>
              <div style={{ marginTop: 6 }}><span className="pill info">{profile?.is_admin ? 'Administrador' : 'Colaborador'}</span></div>
            </div>
            {profile?.is_admin && <><hr /><div style={{ padding: '4px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="eyebrow">Visualizar como</span><ModoSeg /></div></>}
            <hr />
            <button onClick={() => { setMenu(false); setPerfil(true) }}><Icon n="user" /> Meu perfil</button>
            <button onClick={() => { setMenu(false); setPerfil(true) }}><Icon n="bell" /> Notificações</button>
            <button onClick={() => { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('ur-theme', r.dataset.theme) } catch {} }}>
              <Icon n="sun" /> Alternar tema claro/escuro</button>
            <hr />
            <button onClick={() => supabase.auth.signOut()}><Icon n="logout" /> Sair</button>
          </div>
        )}
        <main className="view"><Outlet /></main>
      </div>
      {(perfil || precisaCadastro) && <PerfilModal primeiro={!!precisaCadastro} onClose={() => setPerfil(false)} />}
    </div>
  )
}

function ModoSeg() {
  const { modo, setModo, toast } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const troca = (m: 'admin' | 'colab') => {
    setModo(m)
    if (m === 'colab' && /^\/(painel|gerenciar)/.test(loc.pathname)) nav('/')
    toast(m === 'admin' ? 'Visualizando como administrador.' : 'Visualizando como colaborador.')
  }
  return (
    <div className="role" role="group" aria-label="Visualizar como">
      <button className={modo === 'admin' ? 'on' : ''} onClick={() => troca('admin')}>Admin</button>
      <button className={modo === 'colab' ? 'on' : ''} onClick={() => troca('colab')}>Colaborador</button>
    </div>
  )
}

function PerfilModal({ primeiro, onClose }: { primeiro: boolean; onClose: () => void }) {
  const { profile, setores, recarregarPerfil, toast } = useStore()
  const [f, setF] = useState({
    nome: profile?.nome || '', setor_id: profile?.setor_id ?? '', cargo: profile?.cargo || '',
    notificacoes: { obrigatorio: true, resposta: true, semanal: false, ...(profile?.notificacoes || {}) },
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function foto(file: File) {
    if (!profile) return
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`
    const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (up.error) { setErro('Não foi possível enviar a foto: ' + up.error.message); return }
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
    await recarregarPerfil(); toast('Foto atualizada.')
  }
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setErro('')
    if (!f.nome.trim() || !f.setor_id) { setErro('Preencha nome e setor.'); return }
    setSalvando(true)
    const { error } = await supabase.from('profiles').update({
      nome: f.nome.trim(), setor_id: Number(f.setor_id), cargo: f.cargo.trim() || null, notificacoes: f.notificacoes,
    }).eq('id', profile!.id)
    setSalvando(false)
    if (error) { setErro(error.message); return }
    await recarregarPerfil(); toast('Perfil salvo.'); onClose()
  }
  const nf = (k: 'obrigatorio' | 'resposta' | 'semanal') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, notificacoes: { ...f.notificacoes, [k]: e.target.checked } })

  return (
    <Modal label="Meu perfil" onClose={primeiro ? undefined : onClose}>
      <div className="modal-head">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <label style={{ cursor: 'pointer' }} title="Trocar foto">
            <Avatar nome={profile?.nome} url={profile?.avatar_url} size={56} />
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && foto(e.target.files[0])} />
          </label>
          <div><span className="eyebrow">{primeiro ? 'Bem-vindo! Complete seu cadastro' : 'Meu perfil'}</span><h2>{profile?.nome}</h2>
            <span className="muted" style={{ fontSize: 12 }}>Clique na foto para trocar</span></div>
        </div>
        {!primeiro && <button className="x" onClick={onClose} aria-label="Fechar"><Icon n="x" /></button>}
      </div>
      <form className="form-grid" onSubmit={salvar}>
        <div className="field"><label htmlFor="p-nome">Nome</label><input className="in" id="p-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
        <div className="field"><label htmlFor="p-email">E-mail</label><input className="in" id="p-email" value={profile?.email || ''} disabled title="O e-mail é o do login e não pode ser alterado" /></div>
        <div className="field"><label htmlFor="p-setor">Setor</label>
          <select className="in" id="p-setor" value={f.setor_id} onChange={(e) => setF({ ...f, setor_id: e.target.value })}>
            <option value="">Selecione…</option>{setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select><span className="hint">Define quais treinamentos são obrigatórios para você.</span></div>
        <div className="field"><label htmlFor="p-cargo">Cargo</label><input className="in" id="p-cargo" value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} /></div>
        {profile?.is_admin && !primeiro && <div className="field full"><div className="role-box">
          <label>Modo de visualização <span className="pill info" style={{ marginLeft: 6 }}>Só administradores</span></label>
          <ModoSeg />
          <span className="hint">No modo Colaborador você vê a Universidade como os demais: sem painel gerencial, sem edição e sem responder dúvidas.</span>
        </div></div>}
        {!primeiro && <div className="field full"><label>Notificações</label>
          <label className="check"><input type="checkbox" checked={!!f.notificacoes.obrigatorio} onChange={nf('obrigatorio')} /> Avisar quando um conteúdo obrigatório for publicado para meu setor</label>
          <label className="check"><input type="checkbox" checked={!!f.notificacoes.resposta} onChange={nf('resposta')} /> Avisar quando minha dúvida for respondida</label>
          <label className="check"><input type="checkbox" checked={!!f.notificacoes.semanal} onChange={nf('semanal')} /> Resumo semanal de novidades por e-mail</label>
        </div>}
        {erro && <div className="err full">{erro}</div>}
        <div className="full toolbar" style={{ justifyContent: 'flex-end' }}>
          {!primeiro && <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>}
          <button className="btn" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : primeiro ? 'Começar' : 'Salvar perfil'}</button>
        </div>
      </form>
    </Modal>
  )
}
