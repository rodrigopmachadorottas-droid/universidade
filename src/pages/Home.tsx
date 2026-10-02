import React from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { TIPO, durTxt, status } from '../lib/types'
import { Card, Icon, StatusPill, Thumb } from '../ui'

export default function Home() {
  const { profile, conteudos, prog, obrigatorioMeu, secao, trilhaDe } = useStore()
  const obr = conteudos.filter(obrigatorioMeu)
  const feitos = obr.filter((c) => status(c, prog[c.id]) === 'concluido').length
  const pendentes = obr.filter((c) => status(c, prog[c.id]) !== 'concluido')
  const cont = conteudos.filter((c) => ['quiz', 'reprovado', 'andamento'].includes(status(c, prog[c.id]))).slice(0, 6)
  const novos = [...conteudos].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4)
  const notas = Object.values(prog).filter((p) => p.nota != null && p.status === 'concluido').map((p) => p.nota as number)
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })
  const primeiroNome = (profile?.nome || '').split(' ')[0]

  return (
    <>
      <section className="hero">
        <div className="welcome"><div className="blueprint" />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="eyebrow" style={{ color: 'rgba(255,255,255,.9)' }}>{hoje}</span>
            <h1>Olá, {primeiroNome}.</h1>
            <p>{pendentes.length ? `Você tem ${pendentes.length} treinamento${pendentes.length > 1 ? 's' : ''} obrigatório${pendentes.length > 1 ? 's' : ''} em aberto.` : 'Você está em dia com os obrigatórios.'}</p>
          </div>
          <div className="stats">
            <div><b>{feitos}/{obr.length}</b><span>obrigatórios concluídos</span></div>
            <div><b>{Object.values(prog).filter((p) => p.status === 'concluido').length}</b><span>conteúdos concluídos</span></div>
            <div><b>{notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) + '%' : '—'}</b><span>nota média</span></div>
          </div>
        </div>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rowline"><h2>Obrigatórios pendentes</h2><span className="pill warn">{pendentes.length}</span></div>
          <div className="pend">
            {pendentes.map((c) => (
              <Link key={c.id} className="pend-item" to={`/conteudo/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <span style={{ color: 'var(--accent-fg)' }}><Icon n={TIPO[c.tipo].i} /></span>
                <div><b>{c.titulo}</b><span className="muted" style={{ fontSize: 12 }}>{trilhaDe(c)?.nome} · {secao(c.secao_id)?.nome} · {durTxt(c)}</span></div>
                <StatusPill c={c} />
              </Link>
            ))}
            {!pendentes.length && <div className="muted">Tudo em dia.</div>}
          </div>
        </div>
      </section>

      {cont.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><h2>Você começou e não terminou</h2><span className="muted" style={{ fontSize: 13 }}>Conteúdo com questionário só conta depois da aprovação.</span></div>
          <div className="continue">
            {cont.map((c) => (
              <Link key={c.id} className="cont" to={`/conteudo/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="mini-thumb"><Thumb c={c} semFlag /></div>
                <div><h3>{c.titulo}</h3><StatusPill c={c} />
                  <span className="muted" style={{ fontSize: 12 }}>{status(c, prog[c.id]) === 'quiz' ? 'Abra e faça o questionário para concluir' : status(c, prog[c.id]) === 'reprovado' ? 'Faça uma nova tentativa' : 'Marque como concluído quando terminar'}</span></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="rowline"><h2>Trilhas</h2><Link className="btn ghost sm" to="/trilhas">Ver todas</Link></div>
        <TrailCards />
      </section>

      {novos.length > 0 && <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>Publicados recentemente</h2>
        <div className="grid">{novos.map((c) => <Card key={c.id} c={c} />)}</div>
      </section>}
      {!conteudos.length && <div className="empty">Ainda não há conteúdos publicados.</div>}
    </>
  )
}

export function TrailCards() {
  const { trilhas, secoes, conteudos, prog } = useStore()
  return (
    <div className="trails">
      {trilhas.map((t) => {
        const sids = secoes.filter((s) => s.trilha_id === t.id).map((s) => s.id)
        const cs = conteudos.filter((c) => sids.includes(c.secao_id))
        const d = cs.filter((c) => status(c, prog[c.id]) === 'concluido').length
        const pct = cs.length ? Math.round((d / cs.length) * 100) : 0
        return (
          <Link key={t.id} className="trail" to={`/trilhas/${t.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            <div className="trail-top" style={{ background: `linear-gradient(135deg,${t.cor},${t.cor2})` }}>
              <div className="blueprint" /><span className="eyebrow">Trilha · {sids.length} seções</span><h2>{t.nome}</h2>
            </div>
            <div className="trail-body">
              <p>{t.descricao}</p>
              <div className={'meter' + (pct === 100 ? ' ok' : '')}><i style={{ width: pct + '%' }} /></div>
              <div className="meta"><span>{cs.length} conteúdos</span><span>{d} concluídos</span><span>{cs.filter((c) => c.obrigatorio).length} obrigatórios</span></div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
