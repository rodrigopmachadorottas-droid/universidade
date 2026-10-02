import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { Conteudo, TIPO, Tipo, embedSrc, urlHint } from '../lib/types'
import { Crumbs, Icon } from '../ui'

type QD = { enunciado: string; alternativas: string[]; correta: number }
type FD = { pergunta: string; resposta: string }

export default function EditorPage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { isAdmin, conteudos, trilhas, secoes, setores, profile, recarregar, toast } = useStore()
  const existente = conteudos.find((c) => c.id === id)
  const tIni = sp.get('trilha') || (existente ? secoes.find((s) => s.id === existente.secao_id)?.trilha_id : trilhas[0]?.id) || ''
  const [trilhaId, setTrilhaId] = useState(tIni)
  const [d, setD] = useState<Partial<Conteudo>>(() => existente ? { ...existente } : {
    titulo: '', tipo: 'video', formato: 'pilula', duracao_min: 5, paginas: 5, codigo: '', descricao: '', tags: [],
    obrigatorio: false, publico_setores: [], embed_url: '', quiz_ativo: true, quiz_nota_min: 70, quiz_sortear: 5,
    quiz_tempo_min: 0, quiz_espera_min: 30, quiz_gabarito: 'aprovado', duvidas_ativas: true, publicado: true,
    secao_id: sp.get('secao') || secoes.find((s) => s.trilha_id === tIni)?.id || '',
  })
  const [tagsTxt, setTagsTxt] = useState((existente?.tags || []).join(', '))
  const [novaSecao, setNovaSecao] = useState('')
  const [perg, setPerg] = useState<QD[]>(existente ? [] : [{ enunciado: '', alternativas: ['', '', '', ''], correta: 0 }])
  const [faq, setFaq] = useState<FD[]>([])
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPrev, setThumbPrev] = useState<string | null>(existente?.thumb_url || null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmaApagar, setConfirmaApagar] = useState(false)

  useEffect(() => {
    if (!existente) return
    Promise.all([
      supabase.from('perguntas_quiz').select('*').eq('conteudo_id', existente.id).order('ordem'),
      supabase.from('faq').select('*').eq('conteudo_id', existente.id).order('ordem'),
    ]).then(([q, f]) => {
      setPerg(((q.data as any[]) || []).map((x) => ({ enunciado: x.enunciado, alternativas: [...x.alternativas, '', '', '', ''].slice(0, Math.max(4, x.alternativas.length)), correta: x.correta })))
      setFaq(((f.data as any[]) || []).map((x) => ({ pergunta: x.pergunta, resposta: x.resposta })))
    })
  }, [existente?.id])

  if (!isAdmin) return <div className="empty">Área de administradores.</div>
  const set = (k: keyof Conteudo, v: any) => setD({ ...d, [k]: v })
  const secoesT = secoes.filter((s) => s.trilha_id === trilhaId)
  const big = d.tipo === 'video' && (d.duracao_min || 0) > 60
  const banco = perg.length

  async function salvar() {
    if (!d.titulo?.trim()) return toast('Dê um título ao conteúdo.')
    if (big) return toast('Vídeos têm limite de 60 min. Divida em partes.')
    if (d.quiz_ativo) {
      if (!banco) return toast('Cadastre ao menos uma pergunta ou desligue o questionário.')
      if ((d.quiz_sortear || 0) > banco) return toast(`O banco tem ${banco} pergunta(s). Sorteie no máximo esse número.`)
      if (perg.some((p) => !p.enunciado.trim() || p.alternativas.filter((a) => a.trim()).length < 2 || !p.alternativas[p.correta]?.trim()))
        return toast('Cada pergunta precisa de enunciado, 2 alternativas e a correta marcada.')
    }
    setSalvando(true)
    try {
      let secao_id = d.secao_id
      if (secao_id === '__nova') {
        if (!novaSecao.trim()) throw new Error('Dê um nome à nova seção.')
        const { data, error } = await supabase.from('secoes').insert({ trilha_id: trilhaId, nome: novaSecao.trim(), ordem: secoesT.length }).select().single()
        if (error) throw error
        secao_id = data.id
      }
      if (!secao_id) throw new Error('Escolha a seção.')
      let thumb_url = d.thumb_url || null
      if (thumbFile) {
        const path = `${crypto.randomUUID()}.${(thumbFile.name.split('.').pop() || 'jpg').toLowerCase()}`
        const up = await supabase.storage.from('thumbs').upload(path, thumbFile, { contentType: thumbFile.type })
        if (up.error) throw up.error
        thumb_url = supabase.storage.from('thumbs').getPublicUrl(path).data.publicUrl
      } else if (!thumbPrev) thumb_url = null
      let arquivo_path = d.arquivo_path || null
      if (arquivo) {
        arquivo_path = `${crypto.randomUUID()}/${arquivo.name.replace(/[^\w.\-]+/g, '_')}`
        const up = await supabase.storage.from('arquivos').upload(arquivo_path, arquivo, { contentType: arquivo.type || 'application/pdf' })
        if (up.error) throw up.error
      }
      const row: any = {
        secao_id, titulo: d.titulo!.trim(), tipo: d.tipo, formato: d.formato,
        duracao_min: d.tipo === 'video' ? d.duracao_min || null : null, paginas: d.tipo !== 'video' ? d.paginas || null : null,
        codigo: d.codigo?.trim() || null, descricao: d.descricao?.trim() || null,
        tags: tagsTxt.split(',').map((s) => s.trim()).filter(Boolean),
        obrigatorio: d.obrigatorio, publico_setores: d.obrigatorio ? d.publico_setores : [],
        embed_url: embedSrc(d.embed_url) || null, arquivo_path, thumb_url,
        quiz_ativo: d.quiz_ativo, quiz_nota_min: d.quiz_nota_min, quiz_sortear: d.quiz_ativo ? d.quiz_sortear : Math.max(1, d.quiz_sortear || 1),
        quiz_tempo_min: d.quiz_tempo_min || 0, quiz_espera_min: d.quiz_espera_min || 0, quiz_gabarito: d.quiz_gabarito,
        duvidas_ativas: d.duvidas_ativas, publicado: d.publicado, updated_at: new Date().toISOString(),
      }
      let cid = existente?.id
      if (cid) {
        const { error } = await supabase.from('conteudos').update(row).eq('id', cid); if (error) throw error
      } else {
        const { data, error } = await supabase.from('conteudos').insert({ ...row, autor: profile?.nome, created_by: profile?.id }).select().single()
        if (error) throw error; cid = data.id
      }
      await supabase.from('perguntas_quiz').delete().eq('conteudo_id', cid)
      const ps = perg.filter((p) => p.enunciado.trim()).map((p, i) => {
        const alts = p.alternativas.map((a, j) => [a.trim(), j] as [string, number]).filter(([a]) => a)
        return { conteudo_id: cid, enunciado: p.enunciado.trim(), alternativas: alts.map((a) => a[0]), correta: Math.max(0, alts.findIndex((a) => a[1] === p.correta)), ordem: i }
      })
      if (ps.length) { const { error } = await supabase.from('perguntas_quiz').insert(ps); if (error) throw error }
      await supabase.from('faq').delete().eq('conteudo_id', cid)
      const fs = faq.filter((f) => f.pergunta.trim() && f.resposta.trim()).map((f, i) => ({ conteudo_id: cid, pergunta: f.pergunta.trim(), resposta: f.resposta.trim(), ordem: i }))
      if (fs.length) { const { error } = await supabase.from('faq').insert(fs); if (error) throw error }
      await recarregar()
      toast(existente ? 'Alterações salvas.' : 'Conteúdo publicado.')
      nav(`/conteudo/${cid}`)
    } catch (e: any) {
      toast('Não foi possível salvar: ' + (e.message || e))
    } finally { setSalvando(false) }
  }
  async function apagar() {
    const { error } = await supabase.from('conteudos').delete().eq('id', existente!.id)
    if (error) return toast(error.message)
    await recarregar(); toast('Conteúdo apagado.'); nav('/gerenciar')
  }
  const upQ = (i: number, patch: Partial<QD>) => setPerg(perg.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  const upF = (i: number, patch: Partial<FD>) => setFaq(faq.map((p, k) => (k === i ? { ...p, ...patch } : p)))

  return (
    <>
      <Crumbs itens={[['Gerenciar conteúdo', '/gerenciar'], [existente ? 'Editar' : 'Novo conteúdo']]} />
      <div className="head"><div><span className="eyebrow">{existente ? 'Editando' : 'Cadastro'}</span><h1>{existente ? existente.titulo : 'Novo conteúdo'}</h1></div>
        <div className="toolbar">
          {existente && (confirmaApagar
            ? <><span className="muted">Apagar também tentativas e dúvidas deste conteúdo?</span><button className="btn" style={{ background: 'var(--bad-fill)' }} onClick={apagar}>Apagar de vez</button><button className="btn ghost" onClick={() => setConfirmaApagar(false)}>Não</button></>
            : <button className="btn ghost danger" onClick={() => setConfirmaApagar(true)}><Icon n="trash" s={16} /> Apagar</button>)}
          <button className="btn ghost" onClick={() => nav(-1)}>Cancelar</button>
          <button className="btn" onClick={salvar} disabled={salvando}><Icon n="check" s={16} /> {salvando ? 'Salvando…' : existente ? 'Salvar alterações' : 'Publicar conteúdo'}</button>
        </div></div>

      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
        <div className="field"><label>Formato do conteúdo</label><div className="types">
          {(Object.keys(TIPO) as Tipo[]).map((k) => (
            <button type="button" key={k} className={'type-opt' + (d.tipo === k ? ' on' : '')} onClick={() => set('tipo', k)}>
              <Icon n={TIPO[k].i} s={22} /><span><b>{TIPO[k].n}</b><small>{k === 'video' ? 'Gravação do Teams ou pílula' : k === 'slides' ? 'PDF exportado do PowerPoint' : 'Documento / POP'}</small></span></button>
          ))}</div></div>

        <div className="form-grid">
          <div className="field full"><label htmlFor="f-titulo">Título</label><input className="in" id="f-titulo" value={d.titulo || ''} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: Como lançar uma medição de contrato" /></div>
          <div className="field"><label htmlFor="f-trilha">Trilha</label>
            <select className="in" id="f-trilha" value={trilhaId} onChange={(e) => { setTrilhaId(e.target.value); set('secao_id', secoes.find((s) => s.trilha_id === e.target.value)?.id || '__nova') }}>
              {trilhas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
          <div className="field"><label htmlFor="f-secao">Seção</label>
            <select className="in" id="f-secao" value={d.secao_id || ''} onChange={(e) => set('secao_id', e.target.value)}>
              {secoesT.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}<option value="__nova">+ Criar nova seção</option></select></div>
          {d.secao_id === '__nova' && <div className="field full"><label htmlFor="f-nsec">Nome da nova seção</label><input className="in" id="f-nsec" value={novaSecao} onChange={(e) => setNovaSecao(e.target.value)} placeholder="Ex.: Diário de obra" /></div>}
          <div className="field"><label htmlFor="f-pop">Código (POP / treinamento)</label><input className="in mono" id="f-pop" value={d.codigo || ''} onChange={(e) => set('codigo', e.target.value)} placeholder="POP-ENG-000" /></div>
          <div className="field"><label htmlFor="f-formato">Tipo</label>
            <select className="in" id="f-formato" value={d.formato} onChange={(e) => set('formato', e.target.value)}>
              <option value="pilula">Pílula de processo (curto)</option><option value="treinamento">Treinamento gravado</option></select></div>
          {d.tipo === 'video' ? <>
            <div className="field"><label htmlFor="f-dur">Duração (min)</label><input className="in num" type="number" min={1} max={60} id="f-dur" value={d.duracao_min || ''} onChange={(e) => set('duracao_min', +e.target.value)} />
              <span className="hint" style={big ? { color: 'var(--bad)' } : undefined}>{big ? 'Acima do limite de 60 min. Divida a gravação em partes.' : 'Limite: 60 min por vídeo.'}</span></div>
            <div className="field full"><label htmlFor="f-url">Código de incorporação do SharePoint</label>
              <textarea className="in mono" id="f-url" rows={3} value={d.embed_url || ''} onChange={(e) => set('embed_url', e.target.value)} placeholder="Cole aqui o <iframe …> do SharePoint" />
              <span className="hint">{urlHint(d.embed_url)}</span></div>
          </> : <>
            <div className="field"><label htmlFor="f-pag">{d.tipo === 'slides' ? 'Nº de slides' : 'Nº de páginas'}</label><input className="in num" type="number" min={1} id="f-pag" value={d.paginas || ''} onChange={(e) => set('paginas', +e.target.value)} /></div>
            <div className="field"><label htmlFor="f-file">Arquivo PDF</label><input className="in" type="file" id="f-file" accept=".pdf,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
              <span className="hint">{arquivo ? `Vai enviar: ${arquivo.name}` : d.arquivo_path ? 'Já tem arquivo. Envie outro para substituir.' : d.tipo === 'slides' ? 'Exporte o PowerPoint como PDF.' : 'PDF do POP. Até 50 MB.'}</span></div>
            <div className="field full"><label htmlFor="f-url2">Ou: código de incorporação do SharePoint (opcional)</label>
              <textarea className="in mono" id="f-url2" rows={2} value={d.embed_url || ''} onChange={(e) => set('embed_url', e.target.value)} placeholder="Use se preferir mostrar o PowerPoint direto do SharePoint" /></div>
          </>}
          <div className="field full"><label htmlFor="f-desc">Descrição</label><textarea className="in" id="f-desc" value={d.descricao || ''} onChange={(e) => set('descricao', e.target.value)} placeholder="O que a pessoa vai aprender e quando usar." /></div>
          <div className="field full"><label htmlFor="f-tags">Tags</label><input className="in" id="f-tags" value={tagsTxt} onChange={(e) => setTagsTxt(e.target.value)} placeholder="medição, contratos, ERP" /><span className="hint">Separe por vírgula. As tags alimentam a busca na visualização em lista.</span></div>
          <div className="field full"><label>Thumbnail</label><div className="drop">
            <div style={{ width: 140, flex: 'none' }}><div className="thumb" style={{ backgroundImage: thumbPrev ? `url(${thumbPrev})` : `linear-gradient(135deg,${trilhas.find((t) => t.id === trilhaId)?.cor || '#E07A0B'},${trilhas.find((t) => t.id === trilhaId)?.cor2 || '#FF9E2C'})` }} /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span>Sem imagem, a capa é gerada com as cores da trilha.</span>
              <div className="toolbar"><label className="btn ghost sm" style={{ cursor: 'pointer' }}>Enviar imagem<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setThumbFile(f); setThumbPrev(URL.createObjectURL(f)) } }} /></label>
                {thumbPrev && <button className="btn ghost sm" onClick={() => { setThumbFile(null); setThumbPrev(null) }}>Remover</button>}</div></div></div></div>
          <label className="check full"><input type="checkbox" checked={!!d.publicado} onChange={(e) => set('publicado', e.target.checked)} /> Publicado (desmarque para deixar como rascunho, visível só para admins)</label>
        </div>

        <div className="section-box"><div className="row"><div><h3>Obrigatoriedade</h3><span className="muted" style={{ fontSize: 13 }}>Conteúdos obrigatórios aparecem no painel gerencial e na tela inicial do público.</span></div>
          <label className="toggle"><input type="checkbox" checked={!!d.obrigatorio} onChange={(e) => set('obrigatorio', e.target.checked)} /><span /></label></div>
          {d.obrigatorio && <><div className="tags">{setores.map((s) => (
            <button type="button" key={s.id} className={'chip' + (d.publico_setores?.includes(s.id) ? ' on' : '')}
              onClick={() => set('publico_setores', d.publico_setores?.includes(s.id) ? d.publico_setores.filter((x) => x !== s.id) : [...(d.publico_setores || []), s.id])}>{s.nome}</button>))}</div>
            <span className="hint muted" style={{ fontSize: 12 }}>Nenhum setor marcado = obrigatório para todos.</span></>}
        </div>

        <div className="section-box"><div className="row"><div><h3>Questionário</h3><span className="muted" style={{ fontSize: 13 }}>Só conta como concluído quem atingir a nota mínima. Cada tentativa sorteia perguntas do banco e embaralha as alternativas.</span></div>
          <label className="toggle"><input type="checkbox" checked={!!d.quiz_ativo} onChange={(e) => set('quiz_ativo', e.target.checked)} /><span /></label></div>
          {d.quiz_ativo && <>
            <div className="form-grid">
              <div className="field"><label htmlFor="f-min">Nota mínima (%)</label><input className="in num" type="number" min={0} max={100} step={5} id="f-min" value={d.quiz_nota_min} onChange={(e) => set('quiz_nota_min', +e.target.value)} /></div>
              <div className="field"><label htmlFor="f-sort">Perguntas sorteadas por tentativa</label><input className="in num" type="number" min={1} max={banco || 1} id="f-sort" value={d.quiz_sortear} onChange={(e) => set('quiz_sortear', +e.target.value)} />
                <span className="hint" style={banco < (d.quiz_sortear || 0) * 3 ? { color: 'var(--amber)' } : undefined}>Banco atual: {banco} pergunta{banco !== 1 ? 's' : ''}. {banco < (d.quiz_sortear || 0) * 3 ? `Recomendado: pelo menos ${(d.quiz_sortear || 0) * 3} (3× o sorteio).` : 'Bom tamanho: as provas variam bastante entre pessoas.'}</span></div>
              <div className="field"><label htmlFor="f-tmin">Tempo mínimo na página antes de liberar (min)</label><input className="in num" type="number" min={0} max={60} id="f-tmin" value={d.quiz_tempo_min} onChange={(e) => set('quiz_tempo_min', +e.target.value)} />
                <span className="hint">Conta só com a aba aberta e visível. Sugestão: metade da duração.</span></div>
              <div className="field"><label htmlFor="f-esp">Espera entre tentativas (min)</label><input className="in num" type="number" min={0} id="f-esp" value={d.quiz_espera_min} onChange={(e) => set('quiz_espera_min', +e.target.value)} /><span className="hint">Evita chutar até acertar.</span></div>
              <div className="field full"><label htmlFor="f-gab">Mostrar o gabarito</label>
                <select className="in" id="f-gab" value={d.quiz_gabarito} onChange={(e) => set('quiz_gabarito', e.target.value)}>
                  <option value="aprovado">Só para quem foi aprovado (recomendado)</option><option value="nunca">Nunca</option><option value="sempre">Sempre, inclusive para quem reprovou</option></select></div>
            </div>
            {perg.map((p, i) => (
              <div className="qbuild" key={i}>
                <div className="rowline"><span className="eyebrow">Pergunta {i + 1}</span><button type="button" className="x" onClick={() => setPerg(perg.filter((_, k) => k !== i))} aria-label="Remover pergunta"><Icon n="trash" s={16} /></button></div>
                <input className="in" value={p.enunciado} onChange={(e) => upQ(i, { enunciado: e.target.value })} placeholder="Enunciado" />
                {p.alternativas.map((a, j) => (
                  <div className="opt-row" key={j}>
                    <input type="radio" name={`cor-${i}`} checked={p.correta === j} onChange={() => upQ(i, { correta: j })} aria-label="Marcar como correta" />
                    <input className="in" value={a} onChange={(e) => upQ(i, { alternativas: p.alternativas.map((x, k) => (k === j ? e.target.value : x)) })} placeholder={`Alternativa ${String.fromCharCode(65 + j)}`} />
                  </div>
                ))}
                <span className="hint muted" style={{ fontSize: 12 }}>Marque a bolinha da alternativa correta.</span>
              </div>
            ))}
            <div><button type="button" className="btn ghost sm" onClick={() => setPerg([...perg, { enunciado: '', alternativas: ['', '', '', ''], correta: 0 }])}><Icon n="plus" s={14} /> Adicionar pergunta</button></div>
          </>}
        </div>

        <div className="section-box"><div className="row"><div><h3>Perguntas e respostas</h3><span className="muted" style={{ fontSize: 13 }}>Colaboradores podem enviar dúvidas neste conteúdo. Só administradores respondem.</span></div>
          <label className="toggle"><input type="checkbox" checked={!!d.duvidas_ativas} onChange={(e) => set('duvidas_ativas', e.target.checked)} /><span /></label></div></div>

        <div className="section-box"><div className="row"><div><h3>Principais dúvidas</h3><span className="muted" style={{ fontSize: 13 }}>Perguntas que já sabemos que vão surgir, com a resposta oficial.</span></div>
          <button type="button" className="btn ghost sm" onClick={() => setFaq([...faq, { pergunta: '', resposta: '' }])}><Icon n="plus" s={14} /> Adicionar</button></div>
          {faq.map((f, i) => (
            <div className="qbuild" key={i}><div className="rowline"><span className="eyebrow">Dúvida {i + 1}</span><button type="button" className="x" onClick={() => setFaq(faq.filter((_, k) => k !== i))} aria-label="Remover"><Icon n="trash" s={16} /></button></div>
              <input className="in" value={f.pergunta} onChange={(e) => upF(i, { pergunta: e.target.value })} placeholder="Pergunta" />
              <textarea className="in" value={f.resposta} onChange={(e) => upF(i, { resposta: e.target.value })} placeholder="Resposta" /></div>
          ))}
          {!faq.length && <span className="muted" style={{ fontSize: 13 }}>Nenhuma cadastrada.</span>}
        </div>
      </div>
    </>
  )
}
