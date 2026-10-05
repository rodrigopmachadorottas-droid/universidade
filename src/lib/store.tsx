import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Conteudo, Profile, Progresso, Secao, Setor, Trilha, obrigatorioPara, status } from './types'

type Store = {
  session: Session | null | undefined
  profile: Profile | null
  setores: Setor[]; trilhas: Trilha[]; secoes: Secao[]; conteudos: Conteudo[]
  prog: Record<string, Progresso>
  pendDuvidas: number
  carregado: boolean
  erroPerfil: string | null
  logo: string
  setLogo: (url: string) => void
  modo: 'admin' | 'colab'; setModo: (m: 'admin' | 'colab') => void
  isAdmin: boolean
  toast: (m: string) => void
  recarregar: () => Promise<void>
  recarregarProg: () => Promise<void>
  recarregarPerfil: () => Promise<void>
  recarregarPend: () => Promise<void>
  secao: (id: string) => Secao | undefined
  trilhaDe: (c: Conteudo) => Trilha | undefined
  isPend: (c: Conteudo) => boolean
  obrigatorioMeu: (c: Conteudo) => boolean
}

const Ctx = createContext<Store>(null as any)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [setores, setSetores] = useState<Setor[]>([])
  const [trilhas, setTrilhas] = useState<Trilha[]>([])
  const [secoes, setSecoes] = useState<Secao[]>([])
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [prog, setProg] = useState<Record<string, Progresso>>({})
  const [pendDuvidas, setPend] = useState(0)
  const [carregado, setCarregado] = useState(false)
  const [modo, setModoState] = useState<'admin' | 'colab'>(() => {
    try { return (localStorage.getItem('ur-modo') as any) || 'admin' } catch { return 'admin' }
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [erroPerfil, setErroPerfil] = useState<string | null>(null)
  const [logo, setLogoState] = useState('/logo.png')
  const setLogo = useCallback((url: string) => {
    const u = url || '/logo.png'
    setLogoState(u)
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((l) => (l.href = u))
  }, [])
  // logo configurada pelo admin (também troca o ícone da aba); funciona antes do login
  useEffect(() => {
    supabase.from('config').select('valor').eq('chave', 'logo_url').maybeSingle().then(({ data }) => { if (data?.valor) setLogo(data.valor) })
  }, [])

  const setModo = (m: 'admin' | 'colab') => { setModoState(m); try { localStorage.setItem('ur-modo', m) } catch {} }
  const toast = useCallback((m: string) => { setMsg(m); window.clearTimeout((toast as any).t); (toast as any).t = window.setTimeout(() => setMsg(null), 2800) }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user?.id
  const recarregarPerfil = useCallback(async () => {
    if (!uid) return
    let { data, error: e1 } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (e1) { setErroPerfil(`Erro ao ler o perfil: ${e1.message}`); setProfile(null); return }
    if (!data) {
      // perfil não criado (ex.: primeiro login antes do banco estar pronto): cria agora
      const r = await supabase.rpc('garantir_perfil')
      if (r.error) setErroPerfil(r.error.message)
      data = (await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()).data
    }
    if (data) setErroPerfil(null)
    else setErroPerfil((e) => e || 'Seu perfil não foi encontrado no banco.')
    setProfile(data as Profile)
  }, [uid])
  const recarregar = useCallback(async () => {
    const [s, t, se, c] = await Promise.all([
      supabase.from('setores').select('*').order('ordem'),
      supabase.from('trilhas').select('*').order('ordem'),
      supabase.from('secoes').select('*').order('ordem'),
      supabase.from('conteudos').select('*').order('created_at'),
    ])
    setSetores((s.data as Setor[]) || []); setTrilhas((t.data as Trilha[]) || [])
    setSecoes((se.data as Secao[]) || []); setConteudos((c.data as Conteudo[]) || [])
  }, [])
  const recarregarProg = useCallback(async () => {
    if (!uid) return
    const { data } = await supabase.from('progresso').select('*').eq('user_id', uid)
    const m: Record<string, Progresso> = {}
    ;(data || []).forEach((p: any) => (m[p.conteudo_id] = p))
    setProg(m)
  }, [uid])
  const recarregarPend = useCallback(async () => {
    const { count } = await supabase.from('duvidas').select('id', { count: 'exact', head: true }).is('resposta', null)
    setPend(count || 0)
  }, [])

  useEffect(() => {
    if (!uid) { setProfile(null); setCarregado(false); return }
    Promise.all([recarregarPerfil(), recarregar(), recarregarProg(), recarregarPend()]).then(() => setCarregado(true))
  }, [uid])

  const value = useMemo<Store>(() => {
    const secao = (id: string) => secoes.find((s) => s.id === id)
    const trilhaDe = (c: Conteudo) => trilhas.find((t) => t.id === secao(c.secao_id)?.trilha_id)
    const obrigatorioMeu = (c: Conteudo) => obrigatorioPara(c, profile)
    const isPend = (c: Conteudo) => status(c, prog[c.id]) !== 'concluido' && (c.quiz_ativo || obrigatorioMeu(c))
    return {
      session, profile, erroPerfil, logo, setLogo, setores, trilhas, secoes, conteudos, prog, pendDuvidas, carregado,
      modo, setModo, isAdmin: Boolean(profile?.is_admin && modo === 'admin'), toast,
      recarregar, recarregarProg, recarregarPerfil, recarregarPend, secao, trilhaDe, isPend, obrigatorioMeu,
    }
  }, [session, profile, erroPerfil, logo, setores, trilhas, secoes, conteudos, prog, pendDuvidas, carregado, modo])

  return (
    <Ctx.Provider value={value}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  )
}
