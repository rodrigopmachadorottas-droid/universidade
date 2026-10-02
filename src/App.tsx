import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import { useStore } from './lib/store'
import Login from './pages/Login'
import Home from './pages/Home'
import { BuscaPage, SecaoPage, TrilhaPage, TrilhasPage } from './pages/Trilhas'
import ConteudoPage from './pages/Conteudo'
import DuvidasPage from './pages/Duvidas'
import PendentesPage from './pages/Pendentes'
import PainelPage from './pages/Painel'
import GerenciarPage from './pages/Gerenciar'
import EditorPage from './pages/Editor'

export default function App() {
  const { session, carregado } = useStore()
  if (session === undefined) return <div className="loading">Carregando…</div>
  if (!session) return <Login />
  if (!carregado) return <div className="loading">Carregando a Universidade…</div>
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
