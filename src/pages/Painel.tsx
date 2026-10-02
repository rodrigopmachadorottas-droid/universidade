import React, { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { Conteudo, Profile, Progresso, fmt } from '../lib/types'
import { Avatar, Icon } from '../ui'

const heat = (p: number) => (p >= 90 ? ['var(--ok-soft)', 'var(--ok)'] : p >= 60 ? ['var(--amber-soft)', 'var(--amber)'] : ['var(--bad-soft)', 'var(--bad)'])
const barColor = (p: number) => (p >= 90 ? 'var(--ok-fill)' : p >= 60 ? 'var(--amber-line)' : 'var(--bad-fill)')
const META = 90

export default function PainelPage() {
  const { isAdmin, conteudos, setores, toast } = useStore()
  const [pessoas, setPessoas] = useState<Profile[]>([])
  const [prog, setProg] = useState<Progresso[]>([])
  const [fSetor, setFSetor] = useState('')
  const [fC, setFC] = useState('')
  const [ok, setOk] = useState(false)
  useEffect(() => {
    if (!isAdmin) return
    const ids = conteudos.filter((c) => c.obrigatorio).map((c) => c.id)
    Promise.all([
      supabase.from('profiles').select('*').order('nome'),
      ids.length ? supabase.from('progresso').select('*').in('conteudo_id', ids) : Promise.resolve({ data: [] }),
    ]).then(([p, g]: any) => { setPessoas(p.data || []); setProg(g.data || []); setOk(true) })
  }, [isAdmin, conteudos.length])
  if (!isAdmin) return <div className="empty">Painel disponível só para administradores.</div>
  if (!ok) return <div className="loading">Carregando painel…</div>

  const obrTodos = conteudos.filter((c) => c.obrigatorio)
  const obr = obrTodos.filter((c) => !fC || c.id === fC)
  const alvo = (c: Conteudo, setorId: number | null) => setorId != null && (c.publico_setores.length === 0 || c.publico_setores.includes(setorId))
  const pmap = new Map(prog.map((x) => [x.user_id + '|' + x.conteudo_id, x]))
  const st = (u: Profile, c: Conteudo) => pmap.get(u.id + '|' + c.id)
  const pool = pessoas.filter((u) => u.setor_id != null && (!fSetor || String(u.setor_id) === fSetor))
  let total = 0, feitos = 0, rep = 0
  const notas: number[] = []
  const porSetor: Record<number, { t: number; o: number }> = {}
  setores.forEach((s) => (porSetor[s.id] = { t: 0, o: 0 }))
  pool.forEach((u) => obr.forEach((c) => {
    if (!alvo(c, u.setor_id)) return
    total++; porSetor[u.setor_id!].t++
    const p = st(u, c)
    if (p?.status === 'concluido') { feitos++; porSetor[u.setor_id!].o++; if (p.nota != null) notas.push(p.nota) } else if (p?.status === 'reprovado') rep++
  }))
  const rows = pool.map((u) => {
    const a = obr.filter((c) => alvo(c, u.setor_id))
    const f = a.filter((c) => st(u, c)?.status === 'concluido').length
    return { u, a, f, pend: a.length - f }
  }).filter((r) => r.a.length).sort((a, b) => b.pend - a.pend || (a.u.nome || '').localeCompare(b.u.nome || ''))
  const emDia = rows.filter((r) => !r.pend).length
  const pct = total ? Math.round((feitos / total) * 100) : 0
  const setoresVis = setores.filter((s) => !fSetor || String(s.id) === fSetor)
  const nomeSetor = (id: number | null) => setores.find((s) => s.id === id)?.nome || '—'

  function copiar() {
    const L = [`Universidade Rottas — adesão aos obrigatórios (${fmt(new Date().toISOString())})`]
    setoresVis.forEach((s) => { const x = porSetor[s.id]; if (x?.t) L.push(`• ${s.nome}: ${Math.round((x.o / x.t) * 100)}% (${x.o}/${x.t})`) })
    rows.filter((r) => r.pend).forEach((r) => L.push(`  - ${r.u.nome} (${nomeSetor(r.u.setor_id)}): ${r.pend} pendente(s)`))
    const t = L.join('\n')
    navigator.clipboard.writeText(t).then(() => toast('Resumo copiado.'), () => toast('Não foi possível copiar.'))
  }

  return (
    <>
      <div className="head"><div><span className="eyebrow">Gestão · atualizado agora</span><h1>Painel gerencial</h1>
        <p>Adesão aos conteúdos obrigatórios por setor. Só conta como concluído quem atingiu a nota mínima no questionário. Meta: {META}%.</p></div>
        <div className="toolbar">
          <select className="in" style={{ width: 'auto' }} value={fSetor} onChange={(e) => setFSetor(e.target.value)}>
            <option value="">Todos os setores</option>{setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
          <select className="in" style={{ width: 'auto', maxWidth: 260 }} value={fC} onChange={(e) => setFC(e.target.value)}>
            <option value="">Todos os obrigatórios</option>{obrTodos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}</select>
          <button className="btn ghost" onClick={copiar}><Icon n="copy" s={16} /> Copiar resumo para a reunião</button>
        </div></div>
      <div className="kpis">
        <div className="kpi"><b style={{ color: heat(pct)[1] }}>{pct}%</b><span>adesão geral ({feitos} de {total} conclusões esperadas)</span></div>
        <div className="kpi"><b>{emDia}/{rows.length}</b><span>colaboradores 100% em dia</span></div>
        <div className="kpi"><b>{rep}</b><span>reprovados no questionário, aguardando nova tentativa</span></div>
        <div className="kpi"><b>{notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) + '%' : '—'}</b><span>nota média de quem concluiu</span></div>
      </div>
      <div className="two">
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="rowline"><h2>Adesão por setor</h2><span className="legend"><span><i style={{ background: 'var(--ink)', opacity: .5, width: 2 }} />meta {META}%</span></span></div>
          <div className="bars">
            {setoresVis.filter((s) => porSetor[s.id]?.t).map((s) => {
              const x = porSetor[s.id]; const p = Math.round((x.o / x.t) * 100)
              return <div className="barrow" key={s.id}><span>{s.nome}</span><div className="bt"><i style={{ width: p + '%', background: barColor(p) }} /><span className="goal" /></div><span className="num mono">{p}% · {x.o}/{x.t}</span></div>
            })}
            {!setoresVis.some((s) => porSetor[s.id]?.t) && <div className="muted">Ninguém no público desses conteúdos ainda.</div>}
          </div>
        </div>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}><h2>Setor × treinamento</h2>
          <div style={{ overflowX: 'auto' }}><table className="heat" style={{ minWidth: 520 }}>
            <thead><tr><th>Setor</th>{obr.map((c) => <th key={c.id} title={c.titulo} style={{ textAlign: 'center' }}>{c.codigo || c.titulo.slice(0, 12)}</th>)}</tr></thead>
            <tbody>{setoresVis.map((s) => (
              <tr key={s.id}><td>{s.nome}</td>{obr.map((c) => {
                if (!alvo(c, s.id)) return <td key={c.id}><span className="muted">—</span></td>
                const us = pessoas.filter((u) => u.setor_id === s.id)
                if (!us.length) return <td key={c.id}><span className="muted">sem pessoas</span></td>
                const o = us.filter((u) => st(u, c)?.status === 'concluido').length
                const p = Math.round((o / us.length) * 100); const [b, f] = heat(p)
                return <td key={c.id}><span className="hc" style={{ background: b, color: f }}>{p}%</span></td>
              })}</tr>
            ))}</tbody></table></div>
          <div className="legend"><span><i style={{ background: 'var(--ok-fill)' }} />90% ou mais</span><span><i style={{ background: 'var(--amber-line)' }} />60–89%</span><span><i style={{ background: 'var(--bad-fill)' }} />abaixo de 60%</span><span>— fora do público</span></div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="rowline"><h2>Colaboradores</h2><span className="muted">{rows.filter((r) => r.pend).length} com pendência</span></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Colaborador</th><th>Setor</th><th>Concluídos</th><th>Pendentes</th><th>Situação</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.u.id}>
                <td><div className="q-who"><Avatar nome={r.u.nome} url={r.u.avatar_url} /><div><b>{r.u.nome}</b><br />{r.u.cargo || r.u.email}</div></div></td>
                <td>{nomeSetor(r.u.setor_id)}</td><td className="num">{r.f}/{r.a.length}</td>
                <td><div className="tags">{r.a.filter((c) => st(r.u, c)?.status !== 'concluido').map((c) => {
                  const rp = st(r.u, c)?.status === 'reprovado'
                  return <span key={c.id} className="chip" title={c.titulo} style={rp ? { color: 'var(--bad)' } : undefined}>{c.codigo || c.titulo.slice(0, 14)}{rp ? ' · reprov.' : ''}</span>
                })}{!r.pend && <span className="muted">—</span>}</div></td>
                <td>{r.pend ? <span className={'pill ' + (r.f ? 'warn' : 'bad')}>{r.f ? 'Parcial' : 'Nada concluído'}</span> : <span className="pill ok">Em dia</span>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5}><div className="empty">Ainda não há colaboradores com setor cadastrado no público dos obrigatórios.</div></td></tr>}
          </tbody>
        </table></div>
      </div>
    </>
  )
}
