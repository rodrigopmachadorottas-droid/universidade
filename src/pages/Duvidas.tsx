import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { TIPO } from '../lib/types'
import { Icon, Seg } from '../ui'
import { Duvida, DuvidaItem, SEL_DUVIDA } from './Conteudo'

type FaqRow = { id: string; conteudo_id: string; pergunta: string; resposta: string }

export default function DuvidasPage() {
  const { conteudos } = useStore()
  const [lista, setLista] = useState<Duvida[]>([])
  const [faqs, setFaqs] = useState<FaqRow[]>([])
  const [aba, setAba] = useState<'perguntas' | 'faq'>('perguntas')
  const [filtro, setFiltro] = useState<'pendentes' | 'respondidas' | 'todas'>('pendentes')
  const [q, setQ] = useState('')
  async function carregar() {
    const [d, f] = await Promise.all([
      supabase.from('duvidas').select(SEL_DUVIDA).order('created_at', { ascending: false }),
      supabase.from('faq').select('*').order('ordem'),
    ])
    setLista((d.data as any) || []); setFaqs((f.data as FaqRow[]) || [])
  }
  useEffect(() => { carregar() }, [])
  const pend = lista.filter((d) => !d.resposta).length
  const ql = q.trim().toLowerCase()
  const titulo = (id: string) => conteudos.find((c) => c.id === id)?.titulo || ''
  const r = lista.filter((d) => (filtro === 'todas' || (filtro === 'pendentes' ? !d.resposta : !!d.resposta))
    && (!ql || (d.texto + ' ' + (d.resposta || '') + ' ' + titulo(d.conteudo_id)).toLowerCase().includes(ql)))
  const rf = faqs.filter((f) => !ql || (f.pergunta + ' ' + f.resposta + ' ' + titulo(f.conteudo_id)).toLowerCase().includes(ql))

  return (
    <>
      <div className="head"><div><span className="eyebrow">Central de dúvidas</span><h1>Dúvidas</h1>
        <p>Todas as perguntas feitas nos conteúdos, com a origem de cada uma. Só administradores respondem.</p></div>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(110px,1fr))' }}>
          <div className="kpi"><b>{lista.length}</b><span>perguntas</span></div>
          <div className="kpi"><b style={{ color: 'var(--amber)' }}>{pend}</b><span>aguardando</span></div>
          <div className="kpi"><b style={{ color: 'var(--ok)' }}>{lista.length - pend}</b><span>respondidas</span></div>
        </div></div>
      <div className="tabs">
        <button className={aba === 'perguntas' ? 'on' : ''} onClick={() => setAba('perguntas')}>Perguntas dos colaboradores</button>
        <button className={aba === 'faq' ? 'on' : ''} onClick={() => setAba('faq')}>Principais dúvidas ({faqs.length})</button>
      </div>
      <div className="toolbar">
        <label className="search" htmlFor="dq"><Icon n="search" s={16} /><input id="dq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar dúvidas" /></label>
        {aba === 'perguntas' && <Seg value={filtro} onChange={setFiltro} opts={[['pendentes', 'Aguardando'], ['respondidas', 'Respondidas'], ['todas', 'Todas']]} />}
      </div>
      <div className="qa">
        {aba === 'faq'
          ? (rf.length ? <div className="faq">{rf.map((f) => {
            const c = conteudos.find((x) => x.id === f.conteudo_id)
            return <details key={f.id}><summary>{f.pergunta}</summary><div className="a" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span>{f.resposta}</span>
              {c && <Link className="from" to={`/conteudo/${c.id}`}><Icon n={TIPO[c.tipo].i} s={14} /> {c.titulo}</Link>}</div></details>
          })}</div> : <div className="empty">Nenhuma dúvida encontrada.</div>)
          : (r.length ? r.map((d) => <DuvidaItem key={d.id} d={d} mostrarOrigem recarregar={carregar} />)
            : <div className="empty">{filtro === 'pendentes' ? 'Nenhuma pergunta aguardando resposta.' : 'Nenhuma pergunta encontrada.'}</div>)}
      </div>
    </>
  )
}
