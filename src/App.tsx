import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import { useStore } from './lib/store'
import Login from './pages/Login'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import { BuscaPage, SecaoPage, TrilhaPage, TrilhasPage } from './pages/Trilhas'
import ConteudoPage from './pages/Conteudo'
import DuvidasPage from './pages/Duvidas'
import PendentesPage from './pages/Pendentes'
import PainelPage from './pages/Painel'
import GerenciarPage from './pages/Gerenciar'
import EditorPage from './pages/Editor'

export default function App() {
  const { session, carregado, profile, erroPerfil, setores } = useStore()
  if (session === undefined) return <div className="loading">Carregando…</div>
  if (!session) return <Login />
  if (!carregado) return <div className="loading">Carregando a Universidade…</div>
  if (!profile || !setores.length) return (
    <div className="login"><div className="login-card">
      <h2>Falta preparar o banco</h2>
      <p className="muted" style={{ margin: 0 }}>{!profile
        ? <>Não encontrei o seu perfil ({session.user.email}). {erroPerfil}</>
        : <>Não há nenhum setor cadastrado.</>}</p>
      <p style={{ margin: 0 }}>No Supabase, abra o <b>SQL Editor</b> e rode o arquivo <code>{erroPerfil && /permission denied|42501/i.test(erroPerfil) ? 'supabase/04_permissoes.sql' : 'supabase/03_correcao_perfil.sql'}</code>. Depois recarregue esta página.</p>
      <div className="toolbar"><button className="btn" onClick={() => location.reload()}>Recarregar</button>
        <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sair</button></div>
    </div></div>
  )
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="trilhas" element={<TrilhasPage />} />
        <Route path="trilhas/:slug" element={<TrilhaPage />} />
        <Route path="trilhas/:slug/:secaoId" element={<SecaoPage />} />
        <Route path="conteudo/:id" element={<ConteudoPage />} />
        <Route path="busca" element={<BuscaPage />} />
        <Route path="duvidas" element={<DuvidasPage />} />
        <Route path="pendentes" element={<PendentesPage />} />
        <Route path="painel" element={<PainelPage />} />
        <Route path="gerenciar" element={<GerenciarPage />} />
        <Route path="gerenciar/novo" element={<EditorPage key="novo" />} />
        <Route path="gerenciar/:id" element={<EditorPage />} />
        <Route path="*" element={<div className="empty">Página não encontrada.</div>} />
      </Route>
    </Routes>
  )
}
