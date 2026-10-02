import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { TIPO, durTxt, fmt } from '../lib/types'
import { Icon, Thumb } from '../ui'

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function GerenciarPage() {
  const { isAdmin, conteudos, secao, trilhaDe } = useStore()
  const [pend, setPend] = useState<Record<string, number>>({})
  useEffect(() => {
    supabase.from('duvidas').select('conteudo_id').is('resposta', null).then(({ data }) => {
      const m: Record<string, number> = {}; (data || []).forEach((d: any) => (m[d.conteudo_id] = (m[d.conteudo_id] || 0) + 1)); setPend(m)
    })
  }, [])
  if (!isAdmin) return <div className="empty">Área de administradores.</div>
  return (
    <>
      <div className="head"><div><span className="eyebrow">Gestão</span><h1>Gerenciar conteúdo</h1>
        <p>Cadastre vídeos, slideshows e PDFs, ligue o questionário com nota mínima e mantenha as principais dúvidas de cada conteúdo.</p></div>
        <Link className="btn" to="/gerenciar/novo"><Icon n="plus" s={16} /> Novo conteúdo</Link></div>
      <TrilhasAdmin />
      <div className="table-wrap"><table>
        <thead><tr><th>Conteúdo</th><th>Trilha / seção</th><th>Formato</th><th>Questionário</th><th>Dúvidas</th><th>Obrigatório</th><th></th></tr></thead>
        <tbody>{conteudos.map((c) => (
          <tr key={c.id}>
            <td><div className="cell-title"><div className="mini-thumb"><Thumb c={c} semFlag /></div><div style={{ minWidth: 0 }}><b style={{ fontWeight: 600 }}>{c.titulo}</b>
              <div className="mono muted">{c.codigo} · {fmt(c.created_at)}{!c.publicado ? ' · rascunho' : ''}</div></div></div></td>
            <td>{trilhaDe(c)?.nome} / {secao(c.secao_id)?.nome}</td>
            <td>{TIPO[c.tipo].n} · {durTxt(c)}{c.tipo === 'video' && !c.embed_url ? <div className="pill bad" style={{ marginTop: 4 }}>Sem link</div> : null}</td>
            <td>{c.quiz_ativo ? <span className="pill info">sorteia {c.quiz_sortear} · mín. {c.quiz_nota_min}%</span> : <span className="muted">Desligado</span>}</td>
            <td>{c.duvidas_ativas ? (pend[c.id] ? <span className="pill warn">{pend[c.id]} aguardando</span> : <span className="pill neutral">Ativas</span>) : <span className="muted">Desligadas</span>}</td>
            <td>{c.obrigatorio ? <span className="pill warn">{c.publico_setores.length ? `${c.publico_setores.length} setor(es)` : 'Todos'}</span> : <span className="muted">Não</span>}</td>
            <td><Link className="btn ghost sm" to={`/gerenciar/${c.id}`}><Icon n="edit" s={14} /> Editar</Link></td>
          </tr>
        ))}
          {!conteudos.length && <tr><td colSpan={7}><div className="empty">Nenhum conteúdo ainda.</div></td></tr>}
        </tbody>
      </table></div>
    </>
  )
}

function TrilhasAdmin() {
  const { trilhas, secoes, conteudos, recarregar, toast } = useStore()
  const [aberto, setAberto] = useState(false)
  const [nt, setNt] = useState({ nome: '', descricao: '', cor: '#E07A0B' })
  const [ns, setNs] = useState<Record<string, string>>({})
  const [apagar, setApagar] = useState<string | null>(null)

  async function addTrilha(e: React.FormEvent) {
    e.preventDefault(); if (!nt.nome.trim()) return
    const { error } = await supabase.from('trilhas').insert({ nome: nt.nome.trim(), descricao: nt.descricao.trim() || null, slug: slugify(nt.nome), cor: nt.cor, cor2: nt.cor, ordem: trilhas.length })
    if (error) toast(error.message); else { toast('Trilha criada.'); setNt({ nome: '', descricao: '', cor: '#E07A0B' }); recarregar() }
  }
  async function addSecao(tid: string) {
    const nome = (ns[tid] || '').trim(); if (!nome) return
    const { error } = await supabase.from('secoes').insert({ trilha_id: tid, nome, ordem: secoes.filter((s) => s.trilha_id === tid).length })
    if (error) toast(error.message); else { toast('Seção criada.'); setNs({ ...ns, [tid]: '' }); recarregar() }
  }
  async function renomear(tab: 'trilhas' | 'secoes', id: string, nome: string) {
    if (!nome.trim()) return
    const { error } = await supabase.from(tab).update({ nome: nome.trim() }).eq('id', id)
    if (error) toast(error.message); else recarregar()
  }
  async function apagarSecao(id: string) {
    const { error } = await supabase.from('secoes').delete().eq('id', id)
    setApagar(null)
    if (error) toast('Mova ou apague os conteúdos desta seção antes.'); else { toast('Seção apagada.'); recarregar() }
  }

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rowline"><div><h2>Trilhas e seções</h2><span className="muted" style={{ fontSize: 13 }}>{trilhas.length} trilhas · {secoes.length} seções</span></div>
        <button className="btn ghost sm" onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar' : 'Organizar'}</button></div>
      {aberto && <>
        {trilhas.map((t) => (
          <div key={t.id} className="qbuild">
            <div className="inline-form"><span style={{ width: 14, height: 14, borderRadius: 4, background: t.cor, flex: 'none' }} />
              <input className="in" defaultValue={t.nome} onBlur={(e) => e.target.value !== t.nome && renomear('trilhas', t.id, e.target.value)} aria-label="Nome da trilha" /></div>
            {secoes.filter((s) => s.trilha_id === t.id).map((s) => {
              const n = conteudos.filter((c) => c.secao_id === s.id).length
              return (
                <div key={s.id} className="inline-form" style={{ paddingLeft: 22 }}>
                  <input className="in" defaultValue={s.nome} onBlur={(e) => e.target.value !== s.nome && renomear('secoes', s.id, e.target.value)} aria-label="Nome da seção" />
                  <span className="muted mono">{n} itens</span>
                  {n === 0 && (apagar === s.id
                    ? <><button className="btn sm" style={{ background: 'var(--bad-fill)' }} onClick={() => apagarSecao(s.id)}>Confirmar</button><button className="btn ghost sm" onClick={() => setApagar(null)}>Cancelar</button></>
                    : <button className="x" onClick={() => setApagar(s.id)} aria-label="Apagar seção"><Icon n="trash" s={16} /></button>)}
                </div>
              )
            })}
            <div className="inline-form" style={{ paddingLeft: 22 }}>
              <input className="in" placeholder="Nova seção (ex.: Diário de obra)" value={ns[t.id] || ''} onChange={(e) => setNs({ ...ns, [t.id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addSecao(t.id)} />
              <button className="btn ghost sm" onClick={() => addSecao(t.id)}><Icon n="plus" s={14} /> Seção</button></div>
          </div>
        ))}
        <form className="inline-form" onSubmit={addTrilha}>
          <input className="in" placeholder="Nova trilha (ex.: Financeiro)" value={nt.nome} onChange={(e) => setNt({ ...nt, nome: e.target.value })} />
          <input className="in" placeholder="Descrição" value={nt.descricao} onChange={(e) => setNt({ ...nt, descricao: e.target.value })} />
          <input type="color" value={nt.cor} onChange={(e) => setNt({ ...nt, cor: e.target.value })} aria-label="Cor da trilha" style={{ width: 42, height: 38, border: 0, background: 'none' }} />
          <button className="btn sm" type="submit"><Icon n="plus" s={14} /> Trilha</button>
        </form>
      </>}
    </div>
  )
}
