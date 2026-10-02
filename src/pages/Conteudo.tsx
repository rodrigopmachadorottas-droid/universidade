import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { Conteudo, TIPO, durTxt, fmt, mmss, status } from '../lib/types'
import { Avatar, Crumbs, Icon, Modal, StatusPill } from '../ui'

type Faq = { id: string; pergunta: string; resposta: string }
export type Duvida = {
  id: string; conteudo_id: string; texto: string; created_at: string; resposta: string | null; respondido_em: string | null
  autor: { nome: string; avatar_url: string | null; setor_id: number | null } | null
  respondente: { nome: string } | null
}
export const SEL_DUVIDA = '*, autor:profiles!duvidas_autor_id_fkey(nome,avatar_url,setor_id), respondente:profiles!duvidas_respondido_por_fkey(nome)'

export default function ConteudoPage() {
  const { id } = useParams()
  const st = useStore()
  const { conteudos, prog, secao, trilhaDe, isAdmin, recarregarProg, toast } = st
  const c = conteudos.find((x) => x.id === id)
  const [aba, setAba] = useState<'sobre' | 'faq' | 'qa'>('sobre')
  const [faq, setFaq] = useState<Faq[]>([])
  const [duvidas, setDuvidas] = useState<Duvida[]>([])
  const [tempo, setTempo] = useState(0)
  const [quiz, setQuiz] = useState(false)
  const [, force] = useState(0)
  const p = c ? prog[c.id] : undefined
  const pendRef = useRef<Conteudo | null>(null)

  async function carregarExtras() {
    if (!id) return
    const [f, d] = await Promise.all([
      supabase.from('faq').select('*').eq('conteudo_id', id).order('ordem'),
      supabase.from('duvidas').select(SEL_DUVIDA).eq('conteudo_id', id).order('created_at', { ascending: false }),
    ])
    setFaq((f.data as Faq[]) || []); setDuvidas((d.data as any) || [])
  }

  // abre o conteúdo, carrega FAQ/dúvidas e começa a contar o tempo com a página visível
  useEffect(() => {
    if (!id) return
    setAba('sobre')
    let vivo = true
    ;(async () => {
      await supabase.rpc('abrir_conteudo', { p_conteudo: id })
      const { data } = await supabase.rpc('ping_tempo', { p_conteudo: id })
      if (vivo && typeof data === 'number') setTempo(data)
      recarregarProg()
    })()
    carregarExtras()
    const tick = window.setInterval(() => { if (document.visibilityState === 'visible') setTempo((t) => t + 1) }, 1000)
    const ping = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase.rpc('ping_tempo', { p_conteudo: id })
      if (vivo && typeof data === 'number') setTempo(data)
    }, 30000)
    const vis = () => { if (document.visibilityState === 'visible') supabase.rpc('ping_tempo', { p_conteudo: id }) }
    document.addEventListener('visibilitychange', vis)
    return () => {
      vivo = false; clearInterval(tick); clearInterval(ping); document.removeEventListener('visibilitychange', vis)
      supabase.rpc('ping_tempo', { p_conteudo: id })
      const pc = pendRef.current
      if (pc && window.location.pathname !== '/conteudo/' + id) toast(`Lembrete: “${pc.titulo}” continua pendente até você fazer o questionário.`)
    }
  }, [id])

  // contador de espera entre tentativas
  useEffect(() => { const t = window.setInterval(() => force((x) => x + 1), 15000); return () => clearInterval(t) }, [])

  if (!c) return <div className="loading">Carregando…</div>
  const t = trilhaDe(c), s = secao(c.secao_id)
  const stt = status(c, p)
  pendRef.current = c.quiz_ativo && stt !== 'concluido' ? c : null
  const falta = Math.max(0, c.quiz_tempo_min * 60 - tempo)
  const liberado = falta <= 0
  const espera = p?.proxima_tentativa && stt !== 'concluido' ? new Date(p.proxima_tentativa).getTime() - Date.now() : 0

  async function marcar() {
    const { error } = await supabase.rpc('marcar_concluido', { p_conteudo: c!.id })
    if (error) toast(error.message); else { toast('Conteúdo concluído.'); recarregarProg() }
  }

  return (
    <>
      <Crumbs itens={[['Trilhas', '/trilhas'], [t?.nome || '', `/trilhas/${t?.slug}`], [s?.nome || '', `/trilhas/${t?.slug}/${s?.id}`], [c.titulo]]} />
      <div className="content-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <Player c={c} />
          <Cta c={c} stt={stt} nota={p?.nota} data={p?.concluido_em} liberado={liberado} falta={falta} espera={espera}
            onQuiz={() => setQuiz(true)} onMarcar={marcar} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="card-meta"><span className="mono muted">{c.codigo}</span>
              <span className="chip">{c.formato === 'treinamento' ? 'Treinamento gravado' : 'Pílula de processo'}</span><StatusPill c={c} /></div>
            <h1 style={{ color: 'var(--accent-fg)' }}>{c.titulo}</h1>
            <div className="meta"><span>{TIPO[c.tipo].n} · {durTxt(c)}</span><span>Publicado em {fmt(c.created_at)}</span>{c.autor && <span>Responsável: {c.autor}</span>}</div>
          </div>
          <div className="tabs" role="tablist">
            <button role="tab" className={aba === 'sobre' ? 'on' : ''} onClick={() => setAba('sobre')}>Sobre</button>
            {faq.length > 0 && <button role="tab" className={aba === 'faq' ? 'on' : ''} onClick={() => setAba('faq')}>Principais dúvidas ({faq.length})</button>}
            {c.duvidas_ativas && <button role="tab" className={aba === 'qa' ? 'on' : ''} onClick={() => setAba('qa')}>Perguntas e respostas ({duvidas.length})</button>}
          </div>
          {aba === 'faq' ? (
            <div className="faq">{faq.map((f, i) => <details key={f.id} open={i === 0}><summary>{f.pergunta}</summary><div className="a">{f.resposta}</div></details>)}</div>
          ) : aba === 'qa' ? (
            <QA c={c} duvidas={duvidas} recarregar={carregarExtras} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, maxWidth: '72ch', whiteSpace: 'pre-wrap' }}>{c.descricao}</p>
              <div className="tags">{c.tags.map((g) => <span key={g} className="chip">#{g}</span>)}</div>
              {c.obrigatorio && <ObrigPublico c={c} />}
            </div>
          )}
        </div>
        <aside className="side-card">
          <div className="panel status-box"><span className="eyebrow">Para concluir</span>
            <ol className="steps">
              <li><span className={'dot ' + (liberado || stt === 'concluido' ? 'ok' : 'cur')}>{liberado || stt === 'concluido' ? <Icon n="check" s={12} /> : '1'}</span>
                <div><b>{c.tipo === 'video' ? 'Assistir ao vídeo' : c.tipo === 'slides' ? 'Ver a apresentação' : 'Ler o documento'}</b>
                  <div className="muted">{c.quiz_ativo && c.quiz_tempo_min ? <>Tempo com a página aberta: {mmss(tempo)} de {c.quiz_tempo_min}:00</> : 'No visualizador acima'}</div></div></li>
              {c.quiz_ativo && <li><span className={'dot ' + (stt === 'concluido' ? 'ok' : liberado ? 'cur' : '')}>{stt === 'concluido' ? <Icon n="check" s={12} /> : '2'}</span>
                <div><b>Ser aprovado no questionário</b><div className="muted">{c.quiz_sortear} perguntas sorteadas · mín. {c.quiz_nota_min}%{p?.tentativas ? ` · ${p.tentativas} tentativa${p.tentativas > 1 ? 's' : ''}` : ''}</div></div></li>}
              <li><span className={'dot ' + (stt === 'concluido' ? 'ok' : '')}>{stt === 'concluido' ? <Icon n="check" s={12} /> : c.quiz_ativo ? '3' : '2'}</span>
                <div><b>{c.quiz_ativo ? 'Aprovado' : 'Concluído'}</b><div className="muted">{stt === 'concluido' ? `Registrado em ${fmt(p?.concluido_em)}` : 'Só aqui ele sai dos pendentes'}</div></div></li>
            </ol>
          </div>
          {isAdmin && <Link className="btn ghost" to={`/gerenciar/${c.id}`}><Icon n="edit" s={16} /> Editar conteúdo</Link>}
          <MesmaSecao c={c} />
        </aside>
      </div>
      {quiz && <Quiz c={c} onClose={() => { setQuiz(false); recarregarProg() }} />}
    </>
  )
}

function ObrigPublico({ c }: { c: Conteudo }) {
  const { setores } = useStore()
  const nomes = c.publico_setores.length ? setores.filter((s) => c.publico_setores.includes(s.id)).map((s) => s.nome).join(', ') : 'todos os setores'
  return <div className="muted" style={{ fontSize: 13 }}>Obrigatório para: {nomes}</div>
}

function MesmaSecao({ c }: { c: Conteudo }) {
  const { conteudos, prog, isPend } = useStore()
  const outros = conteudos.filter((x) => x.secao_id === c.secao_id && x.id !== c.id)
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><span className="eyebrow">Na mesma seção</span>
      {outros.map((x) => (
        <Link key={x.id} className="pend-item" to={`/conteudo/${x.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          <span style={{ color: 'var(--accent-fg)' }}><Icon n={TIPO[x.tipo].i} s={16} /></span>
          <div><b>{x.titulo}</b><span className="muted" style={{ fontSize: 12 }}>{durTxt(x)}</span></div>
          {status(x, prog[x.id]) === 'concluido' ? <span style={{ color: 'var(--ok)' }}><Icon n="check" s={16} /></span> : isPend(x) ? <span className="pill warn">Pendente</span> : null}
        </Link>
      ))}
      {!outros.length && <span className="muted">Só este por enquanto.</span>}
    </div>
  )
}

function Player({ c }: { c: Conteudo }) {
  const { trilhaDe, isAdmin } = useStore()
  const [pdf, setPdf] = useState<string | null>(null)
  useEffect(() => {
    setPdf(null)
    if (c.tipo !== 'video' && c.arquivo_path) {
      supabase.storage.from('arquivos').createSignedUrl(c.arquivo_path, 60 * 60 * 4).then(({ data }) => setPdf(data?.signedUrl || null))
    }
  }, [c.id, c.arquivo_path])
  const src = c.tipo === 'video' ? c.embed_url : pdf || c.embed_url
  const t = trilhaDe(c)
  if (src) {
    return (
      <div className="player frame">
        <iframe src={src} title={c.titulo} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    )
  }
  return (
    <div className="player"><div className="stage" style={{ backgroundImage: `linear-gradient(135deg,${t?.cor},${t?.cor2})` }}><div className="blueprint" />
      <div className="sp-frame"><span className="bigplay" style={{ cursor: 'default' }}><Icon n={TIPO[c.tipo].i} s={30} /></span>
        <small>{c.tipo === 'video' ? 'Vídeo ainda não vinculado ao SharePoint.' : 'Arquivo ainda não enviado.'}{isAdmin ? ' Clique em “Editar conteúdo” para vincular.' : ''}</small></div></div>
      <div className="pbar"><span><Icon n={TIPO[c.tipo].i} s={14} /></span><span>{durTxt(c)}</span><div style={{ flex: 1 }} /><span style={{ opacity: .7 }}>SharePoint / Stream</span></div>
    </div>
  )
}

function Cta({ c, stt, nota, data, liberado, falta, espera, onQuiz, onMarcar }: any) {
  if (!c.quiz_ativo) {
    if (stt === 'concluido') return <div className="cta ok"><div><span className="cta-ic"><Icon n="check" /></span><div><b>Conteúdo concluído</b><p>Registrado em {fmt(data)}.</p></div></div></div>
    return <div className="cta warn"><div><span className="cta-ic"><Icon n={TIPO[c.tipo].i} /></span><div><b>Terminou? Marque como concluído.</b><p>Este conteúdo não tem questionário.</p></div></div>
      <button className="btn" onClick={onMarcar}><Icon n="check" s={16} /> Marcar como concluído</button></div>
  }
  if (stt === 'concluido') return <div className="cta ok"><div><span className="cta-ic"><Icon n="check" /></span><div><b>Aprovado com {nota}% em {fmt(data)}</b><p>Já aparece como concluído no painel gerencial.</p></div></div></div>
  let btn: React.ReactNode
  if (!liberado) btn = <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
    <button className="btn" disabled><Icon n="lock" s={16} /> Libera em {mmss(falta)}</button>
    <span className="muted" style={{ fontSize: 12 }}>Tempo mínimo com o conteúdo aberto: {c.quiz_tempo_min} min</span></div>
  else if (espera > 0) btn = <button className="btn" disabled><Icon n="lock" s={16} /> Nova tentativa em {Math.ceil(espera / 60000)} min</button>
  else btn = <button className="btn" onClick={onQuiz}><Icon n="quiz" s={16} /> {stt === 'reprovado' ? 'Fazer nova tentativa' : 'Fazer o questionário'}</button>
  return (
    <div className={'cta ' + (stt === 'reprovado' ? 'bad' : 'warn')}>
      <div><span className="cta-ic"><Icon n="quiz" /></span><div>
        {stt === 'reprovado' ? <><b>Reprovado com {nota}%. A nota mínima é {c.quiz_nota_min}%.</b><p>Reveja o conteúdo. A próxima tentativa sorteia outras perguntas.</p></>
          : <><b>Este conteúdo só conta como concluído depois do questionário.</b><p>{c.quiz_sortear} perguntas sorteadas · nota mínima {c.quiz_nota_min}% · sem o questionário ele continua pendente.</p></>}
      </div></div>{btn}
    </div>
  )
}

type QPerg = { enunciado: string; alternativas: { i: number; texto: string }[] }
function Quiz({ c, onClose }: { c: Conteudo; onClose: () => void }) {
  const [tent, setTent] = useState<string | null>(null)
  const [perg, setPerg] = useState<QPerg[]>([])
  const [resp, setResp] = useState<Record<number, number>>({})
  const [res, setRes] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  useEffect(() => {
    ;(async () => {
      await supabase.rpc('ping_tempo', { p_conteudo: c.id })   // garante que o servidor contou o tempo até agora
      const { data, error } = await supabase.rpc('iniciar_questionario', { p_conteudo: c.id })
      if (error) setErro(error.message); else { setTent(data.tentativa); setPerg(data.perguntas) }
    })()
  }, [])
  async function enviar() {
    setEnviando(true)
    const { data, error } = await supabase.rpc('enviar_questionario', { p_tentativa: tent, p_respostas: perg.map((_, i) => resp[i] ?? null) })
    setEnviando(false)
    if (error) setErro(error.message); else setRes(data)
  }
  const todas = perg.length > 0 && perg.every((_, i) => resp[i] != null)
  return (
    <Modal label="Questionário" onClose={onClose}>
      <div className="modal-head"><div><span className="eyebrow">Questionário · nota mínima {c.quiz_nota_min}%</span><h2>{c.titulo}</h2></div>
        <button className="x" onClick={onClose} aria-label="Fechar"><Icon n="x" /></button></div>
      {erro && <div className="err">{erro}</div>}
      {!erro && !res && !perg.length && <div className="loading">Sorteando perguntas…</div>}
      {!res && perg.length > 0 && <>
        <div className="muted" style={{ fontSize: 13 }}>{perg.length} perguntas sorteadas do banco. A ordem das alternativas também muda a cada tentativa.</div>
        {perg.map((q, i) => (
          <div className="quiz-q" key={i}><h3>{i + 1}. {q.enunciado}</h3>
            {q.alternativas.map((a) => <button key={a.i} className={'opt' + (resp[i] === a.i ? ' on' : '')} onClick={() => setResp({ ...resp, [i]: a.i })}><span className="r" />{a.texto}</button>)}
          </div>
        ))}
        <div className="toolbar" style={{ justifyContent: 'flex-end' }}><button className="btn" disabled={!todas || enviando} onClick={enviar}>{enviando ? 'Corrigindo…' : 'Enviar respostas'}</button></div>
      </>}
      {res && <>
        <div className={'result ' + (res.aprovado ? 'ok' : 'bad')}><b>{res.nota}%</b><div>
          <strong>{res.aprovado ? 'Aprovado. Conteúdo concluído.' : `Reprovado. A nota mínima é ${c.quiz_nota_min}%.`}</strong>
          <div style={{ fontSize: 13 }}>Você acertou {res.acertos} de {res.total}. {res.aprovado ? 'Seu registro já aparece no painel gerencial.' : `Reveja o conteúdo. A próxima tentativa libera em ${res.espera_min} min e sorteia outras perguntas.`}</div></div></div>
        {res.gabarito ? res.gabarito.map((q: any, i: number) => (
          <div className="quiz-q" key={i}><h3>{i + 1}. {q.enunciado}</h3>
            {q.alternativas.map((a: any) => <div key={a.i} className={'opt' + (a.i === q.correta ? ' right' : a.i === q.escolhida ? ' wrong' : '')} style={{ cursor: 'default' }}><span className="r" />{a.texto}</div>)}
          </div>
        )) : !res.aprovado && <div className="muted" style={{ fontSize: 13 }}>As respostas certas não são mostradas depois de uma reprovação. Assim o gabarito não circula entre a equipe.</div>}
        <div className="toolbar" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onClose}>{res.aprovado ? 'Fechar' : 'Voltar ao conteúdo'}</button></div>
      </>}
    </Modal>
  )
}

export function DuvidaItem({ d, mostrarOrigem, recarregar }: { d: Duvida; mostrarOrigem?: boolean; recarregar: () => void }) {
  const { isAdmin, profile, conteudos, toast, recarregarPend, setores } = useStore()
  const [txt, setTxt] = useState('')
  const c = conteudos.find((x) => x.id === d.conteudo_id)
  const setor = setores.find((s) => s.id === d.autor?.setor_id)?.nome
  async function responder(e: React.FormEvent) {
    e.preventDefault(); if (!txt.trim()) return
    const { error } = await supabase.from('duvidas').update({ resposta: txt.trim(), respondido_por: profile!.id, respondido_em: new Date().toISOString() }).eq('id', d.id)
    if (error) toast(error.message); else { toast('Resposta publicada.'); setTxt(''); recarregar(); recarregarPend() }
  }
  async function promover() {
    const { error } = await supabase.from('faq').insert({ conteudo_id: d.conteudo_id, pergunta: d.texto, resposta: d.resposta, ordem: 99 })
    toast(error ? error.message : 'Adicionada às principais dúvidas do conteúdo.')
  }
  return (
    <div className="q">
      <div className="q-head"><div className="q-who"><Avatar nome={d.autor?.nome} url={d.autor?.avatar_url} /><div><b>{d.autor?.nome}</b>{setor ? ` · ${setor}` : ''}<br />{fmt(d.created_at)}</div></div>
        {d.resposta ? <span className="pill ok">Respondida</span> : <span className="pill warn">Aguardando resposta</span>}</div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{d.texto}</p>
      {mostrarOrigem && c && <Link className="from" to={`/conteudo/${c.id}`}><Icon n={TIPO[c.tipo].i} s={14} /> {c.titulo}</Link>}
      {d.resposta ? <>
        <div className="answer"><span className="eyebrow">Resposta · {d.respondente?.nome} · {fmt(d.respondido_em)}</span><span style={{ whiteSpace: 'pre-wrap' }}>{d.resposta}</span></div>
        {isAdmin && <div><button className="btn ghost sm" onClick={promover}><Icon n="star" s={14} /> Levar para principais dúvidas</button></div>}
      </> : isAdmin && (
        <form onSubmit={responder} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea className="in" required value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Responder como administrador" />
          <div><button className="btn sm" type="submit">Publicar resposta</button></div>
        </form>
      )}
    </div>
  )
}

function QA({ c, duvidas, recarregar }: { c: Conteudo; duvidas: Duvida[]; recarregar: () => void }) {
  const { toast, recarregarPend } = useStore()
  const [txt, setTxt] = useState('')
  async function perguntar(e: React.FormEvent) {
    e.preventDefault(); if (!txt.trim()) return
    const { error } = await supabase.from('duvidas').insert({ conteudo_id: c.id, texto: txt.trim() })
    if (error) toast(error.message); else { toast('Pergunta enviada. Você será avisado quando responderem.'); setTxt(''); recarregar(); recarregarPend() }
  }
  return (
    <div className="qa">
      <form className="q" onSubmit={perguntar}>
        <label htmlFor="askq" style={{ fontWeight: 600 }}>Ficou com dúvida sobre este conteúdo?</label>
        <textarea className="in" id="askq" required value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Escreva sua pergunta. Os administradores respondem e a resposta fica visível para todos." />
        <div><button className="btn" type="submit">Enviar pergunta</button></div>
      </form>
      {duvidas.map((d) => <DuvidaItem key={d.id} d={d} recarregar={recarregar} />)}
      {!duvidas.length && <div className="empty">Ninguém perguntou nada ainda.</div>}
    </div>
  )
}
