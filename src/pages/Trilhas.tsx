import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Conteudo, TIPO, durTxt, status } from '../lib/types'
import { Card, Crumbs, Icon, Seg, StatusPill, Thumb } from '../ui'
import { TrailCards } from './Home'

export function TrilhasPage() {
  return (
    <>
      <div className="head"><div><span className="eyebrow">Catálogo</span><h1>Trilhas</h1>
        <p>Cada trilha é dividida em seções por assunto. Os conteúdos são curtos e tratam de um ponto só, para você ir direto ao que precisa.</p></div></div>
      <TrailCards />
    </>
  )
}

export function TrilhaPage() {
  const { slug } = useParams()
  const { trilhas, secoes, conteudos, prog, isPend, isAdmin } = useStore()
  const [modo, setModo] = useState<'pastas' | 'lista'>(() => { try { return (localStorage.getItem('ur-vis') as any) || 'pastas' } catch { return 'pastas' } })
  const t = trilhas.find((x) => x.slug === slug)
  if (!t) return <div className="empty">Trilha não encontrada.</div>
  const ss = secoes.filter((s) => s.trilha_id === t.id)
  const cs = conteudos.filter((c) => ss.some((s) => s.id === c.secao_id))
  const muda = (m: 'pastas' | 'lista') => { setModo(m); try { localStorage.setItem('ur-vis', m) } catch {} }
  return (
    <>
      <Crumbs itens={[['Trilhas', '/trilhas'], [t.nome]]} />
      <div className="head"><div><span className="eyebrow">Trilha</span><h1>{t.nome}</h1><p>{t.descricao}</p></div>
        <div className="toolbar">
          <Seg value={modo} onChange={muda} opts={[['pastas', <><Icon n="folder" s={16} /> Pastas</>], ['lista', <><Icon n="list" s={16} /> Lista</>]]} />
          {isAdmin && <Link className="btn" to={`/gerenciar/novo?trilha=${t.id}`}><Icon n="plus" s={16} /> Novo conteúdo</Link>}
        </div></div>
      {modo === 'pastas' ? (
        <div className="folders" style={{ marginTop: 8 }}>
          {ss.map((s) => {
            const x = cs.filter((c) => c.secao_id === s.id)
            const d = x.filter((c) => status(c, prog[c.id]) === 'concluido').length
            const min = x.filter((c) => c.tipo === 'video').reduce((a, c) => a + (c.duracao_min || 0), 0)
            const p = x.filter(isPend).length
            return (
              <Link key={s.id} className="folder" to={`/trilhas/${t.slug}/${s.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="rowline"><span className="folder-ic"><Icon n="folder" /></span><span className="mono muted">{x.length} itens</span></div>
                <div><h2>{s.nome}</h2><p>{s.descricao}</p></div>
                <div className={'meter' + (d === x.length && x.length ? ' ok' : '')}><i style={{ width: (x.length ? (d / x.length) * 100 : 0) + '%' }} /></div>
                <div className="meta"><span>{d}/{x.length} concluídos</span>{min > 0 && <span>{min} min de vídeo</span>}
                  {p > 0 && <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{p} pendente{p > 1 ? 's' : ''}</span>}</div>
              </Link>
            )
          })}
          {!ss.length && <div className="empty">Nenhuma seção nesta trilha ainda.</div>}
        </div>
      ) : <Lista cs={cs} />}
    </>
  )
}

function Lista({ cs }: { cs: Conteudo[] }) {
  const { secao, prog, isPend } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [tipo, setTipo] = useState('')
  const [st, setSt] = useState('')
  const tags = useMemo(() => [...new Set(cs.flatMap((c) => c.tags))].sort((a, b) => a.localeCompare(b)), [cs])
  const ql = q.trim().toLowerCase()
  const r = cs.filter((c) => (!ql || [c.titulo, c.descricao, c.codigo, ...c.tags].join(' ').toLowerCase().includes(ql))
    && (!tag || c.tags.includes(tag)) && (!tipo || c.tipo === tipo)
    && (!st || (st === 'ok' ? status(c, prog[c.id]) === 'concluido' : st === 'pend' ? isPend(c) : c.obrigatorio)))
  return (
    <>
      <div className="toolbar">
        <label className="search" htmlFor="lq"><Icon n="search" s={16} /><input id="lq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar nesta trilha: título, descrição, tag ou código POP" /></label>
        <select className="in" style={{ width: 'auto' }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos os formatos</option>{Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}</select>
        <select className="in" style={{ width: 'auto' }} value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Qualquer status</option><option value="pend">Pendentes</option><option value="ok">Concluídos</option><option value="obr">Obrigatórios</option></select>
      </div>
      <div className="tags">{tags.map((g) => <button key={g} className={'chip' + (tag === g ? ' on' : '')} onClick={() => setTag(tag === g ? null : g)}>#{g}</button>)}</div>
      <div className="table-wrap"><table>
        <thead><tr><th>Conteúdo</th><th>Seção</th><th>Formato</th><th>Duração</th><th>Tags</th><th>Status</th></tr></thead>
        <tbody>
          {r.map((c) => (
            <tr key={c.id} className="click" onClick={() => nav(`/conteudo/${c.id}`)}>
              <td><div className="cell-title"><div className="mini-thumb"><Thumb c={c} semFlag /></div><div style={{ minWidth: 0 }}><b style={{ fontWeight: 600 }}>{c.titulo}</b><div className="mono muted">{c.codigo}</div></div></div></td>
              <td>{secao(c.secao_id)?.nome}</td><td>{TIPO[c.tipo].n}</td><td className="num">{durTxt(c)}</td>
              <td><div className="tags">{c.tags.map((g) => <span key={g} className="chip">#{g}</span>)}</div></td>
              <td><StatusPill c={c} /></td>
            </tr>
          ))}
          {!r.length && <tr><td colSpan={6}><div className="empty">Nada encontrado com esses filtros. Tente outra palavra ou registre sua dúvida na página Dúvidas.</div></td></tr>}
        </tbody>
      </table></div>
    </>
  )
}

export function SecaoPage() {
  const { slug, secaoId } = useParams()
  const { trilhas, secoes, conteudos, prog, isPend, isAdmin } = useStore()
  const [sf, setSf] = useState<'todos' | 'pend' | 'ok'>('todos')
  const t = trilhas.find((x) => x.slug === slug)
  const s = secoes.find((x) => x.id === secaoId)
  if (!t || !s) return <div className="empty">Seção não encontrada.</div>
  const cs = conteudos.filter((c) => c.secao_id === s.id)
  const p = cs.filter(isPend).length, o = cs.filter((c) => status(c, prog[c.id]) === 'concluido').length
  const r = sf === 'pend' ? cs.filter(isPend) : sf === 'ok' ? cs.filter((c) => status(c, prog[c.id]) === 'concluido') : cs
  return (
    <>
      <Crumbs itens={[['Trilhas', '/trilhas'], [t.nome, `/trilhas/${t.slug}`], [s.nome]]} />
      <div className="head"><div><span className="eyebrow">Seção · {t.nome}</span><h1>{s.nome}</h1><p>{s.descricao}</p></div>
        {isAdmin && <Link className="btn" to={`/gerenciar/novo?trilha=${t.id}&secao=${s.id}`}><Icon n="plus" s={16} /> Novo conteúdo nesta seção</Link>}</div>
      <Seg value={sf} onChange={setSf} opts={[['todos', `Todos (${cs.length})`], ['pend', `Pendentes (${p})`], ['ok', `Concluídos (${o})`]]} />
      {cs.length ? (r.length ? <div className="grid">{r.map((c) => <Card key={c.id} c={c} />)}</div>
        : <div className="empty">{sf === 'pend' ? 'Nada pendente nesta seção.' : 'Nenhum conteúdo concluído ainda nesta seção.'}</div>)
        : <div className="empty">Nenhum conteúdo nesta seção ainda.</div>}
    </>
  )
}

export function BuscaPage() {
  const [sp] = useSearchParams()
  const q = (sp.get('q') || '').trim()
  const { conteudos, secao } = useStore()
  const ql = q.toLowerCase()
  const r = conteudos.filter((c) => [c.titulo, c.descricao, c.codigo, ...c.tags, secao(c.secao_id)?.nome].join(' ').toLowerCase().includes(ql))
  return (
    <>
      <div className="head"><div><span className="eyebrow">Busca</span><h1>{r.length} resultado{r.length !== 1 ? 's' : ''} para “{q}”</h1></div></div>
      {r.length ? <div className="grid">{r.map((c) => <Card key={c.id} c={c} />)}</div> : <div className="empty">Nada encontrado. Tente “medição”, “aditivo” ou “Mereo”.</div>}
    </>
  )
}
