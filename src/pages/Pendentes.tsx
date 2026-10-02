import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { fmt, status } from '../lib/types'
import { StatusPill } from '../ui'

export default function PendentesPage() {
  const { conteudos, prog, obrigatorioMeu, isPend, secao, trilhaDe, setores, profile } = useStore()
  const nav = useNavigate()
  const obr = conteudos.filter(obrigatorioMeu)
  const lista = conteudos.filter((c) => prog[c.id] || obrigatorioMeu(c))
    .sort((a, b) => Number(isPend(b)) - Number(isPend(a)) || Number(obrigatorioMeu(b)) - Number(obrigatorioMeu(a)))
  const min = conteudos.filter((c) => status(c, prog[c.id]) === 'concluido' && c.tipo === 'video').reduce((a, c) => a + (c.duracao_min || 0), 0)
  return (
    <>
      <div className="head"><div><span className="eyebrow">{setores.find((s) => s.id === profile?.setor_id)?.nome}</span><h1>Meus pendentes</h1>
        <p>Conteúdo com questionário só sai daqui quando você é aprovado. Abrir ou assistir não basta.</p></div></div>
      <div className="kpis">
        <div className="kpi"><b>{obr.filter((c) => status(c, prog[c.id]) === 'concluido').length}/{obr.length}</b><span>obrigatórios concluídos</span></div>
        <div className="kpi"><b>{conteudos.filter((c) => status(c, prog[c.id]) === 'concluido').length}</b><span>conteúdos concluídos no total</span></div>
        <div className="kpi"><b>{conteudos.filter((c) => ['quiz', 'reprovado'].includes(status(c, prog[c.id]))).length}</b><span>questionários pendentes</span></div>
        <div className="kpi"><b>{min} min</b><span>de vídeo em conteúdos concluídos</span></div>
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>Conteúdo</th><th>Trilha / seção</th><th>Status</th><th>Nota</th><th>Concluído em</th></tr></thead>
        <tbody>
          {lista.map((c) => (
            <tr key={c.id} className="click" onClick={() => nav(`/conteudo/${c.id}`)}>
              <td><b style={{ fontWeight: 600 }}>{c.titulo}</b> {obrigatorioMeu(c) && <span className="pill warn">Obrigatório</span>}</td>
              <td>{trilhaDe(c)?.nome} / {secao(c.secao_id)?.nome}</td>
              <td><StatusPill c={c} /></td>
              <td className="num">{prog[c.id]?.nota != null ? prog[c.id].nota + '%' : '—'}</td>
              <td className="num">{fmt(prog[c.id]?.concluido_em) || '—'}</td>
            </tr>
          ))}
          {!lista.length && <tr><td colSpan={5}><div className="empty">Nada por aqui ainda. Abra uma trilha para começar.</div></td></tr>}
        </tbody>
      </table></div>
    </>
  )
}
