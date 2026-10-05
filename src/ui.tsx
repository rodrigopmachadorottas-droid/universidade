import React from 'react'
import { Link } from 'react-router-dom'
import { useStore } from './lib/store'
import { Conteudo, TIPO, durTxt, ini, status } from './lib/types'

export const IC: Record<string, string> = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  trail: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
  slides: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/>',
  pdf: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  quiz: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  out: '<path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  logout: '<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>',
  enter: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
}

export function Icon({ n, s = 18 }: { n: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: IC[n] || '' }} />
  )
}

export function Avatar({ nome, url, size }: { nome?: string | null; url?: string | null; size?: number }) {
  const st = size ? { width: size, height: size } : undefined
  return url ? <img className="avatar" src={url} alt="" style={st} /> : <span className="avatar" style={st}>{ini(nome)}</span>
}

export function StatusPill({ c }: { c: Conteudo }) {
  const { prog, obrigatorioMeu } = useStore()
  const p = prog[c.id]
  const s = status(c, p)
  if (s === 'concluido')
    return <span className="pill ok"><Icon n="check" s={12} /> {c.quiz_ativo ? `Aprovado${p?.nota != null ? ' · ' + p.nota + '%' : ''}` : 'Concluído'}</span>
  if (s === 'quiz') return <span className="pill warn"><Icon n="quiz" s={12} /> Pendente · falta o questionário</span>
  if (s === 'reprovado') return <span className="pill bad">Reprovado · {p?.nota}% (mín. {c.quiz_nota_min}%)</span>
  if (s === 'andamento') return <span className="pill info">Aberto</span>
  if (obrigatorioMeu(c)) return <span className="pill warn">Obrigatório · pendente</span>
  return c.quiz_ativo ? <span className="pill neutral">Pendente</span> : null
}

export function Thumb({ c, semFlag }: { c: Conteudo; semFlag?: boolean }) {
  const { trilhaDe, secao, prog, isPend } = useStore()
  const t = trilhaDe(c)
  const s = status(c, prog[c.id])
  const bg = c.thumb_url
    ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.5)),url(${c.thumb_url})` }
    : { backgroundImage: `linear-gradient(135deg,${t?.cor || '#E07A0B'},${t?.cor2 || '#FF9E2C'})` }
  return (
    <div className={'thumb' + (c.thumb_url ? ' img' : '')} style={bg}>
      {!c.thumb_url && <div className="blueprint" />}
      <span className="t-code">{c.codigo || ''} · {secao(c.secao_id)?.nome || ''}</span>
      <span className="t-title">{c.titulo}</span>
      <div className="t-bot">
        <span className="t-type"><Icon n={TIPO[c.tipo].i} s={13} /> {TIPO[c.tipo].n}</span>
        <span className="t-dur">{durTxt(c)}</span>
      </div>
      {!semFlag && (s === 'concluido'
        ? <span className="t-flag ok"><Icon n="check" s={12} /> {c.quiz_ativo ? 'Aprovado' : 'Concluído'}</span>
        : isPend(c) ? <span className={'t-flag ' + (s === 'reprovado' ? 'bad' : 'warn')}>{s === 'reprovado' ? 'Reprovado' : 'Pendente'}</span> : null)}
    </div>
  )
}

export function Card({ c }: { c: Conteudo }) {
  const { secao } = useStore()
  return (
    <Link className="card" to={`/conteudo/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
      <Thumb c={c} />
      <div className="card-meta">
        <span className="eyebrow">{secao(c.secao_id)?.nome}</span>
        {c.formato === 'treinamento' && <span className="chip">Treinamento gravado</span>}
      </div>
      <h3>{c.titulo}</h3>
      <div className="card-meta">
        <StatusPill c={c} />
        {c.quiz_ativo && <span className="chip"><Icon n="quiz" s={11} /> Quiz · mín. {c.quiz_nota_min}%</span>}
      </div>
    </Link>
  )
}

export function Crumbs({ itens }: { itens: [string, string?][] }) {
  return (
    <nav className="crumbs">
      {itens.map(([n, to], i) => (
        <React.Fragment key={i}>
          {to ? <Link to={to} style={{ color: 'var(--accent-fg)', textDecoration: 'none' }}>{n}</Link> : <span>{n}</span>}
          {i < itens.length - 1 && <span>/</span>}
        </React.Fragment>
      ))}
    </nav>
  )
}

export function Modal({ children, onClose, label }: { children: React.ReactNode; onClose?: () => void; label: string }) {
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && onClose) onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>
  )
}

export function Seg({ value, onChange, opts }: { value: string; onChange: (v: any) => void; opts: [string, React.ReactNode][] }) {
  return (
    <div className="seg" role="group">
      {opts.map(([k, n]) => <button key={k} type="button" className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{n}</button>)}
    </div>
  )
}
