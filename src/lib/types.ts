export type Setor = { id: number; nome: string; ordem: number }
export type Profile = {
  id: string; email: string; nome: string | null; setor_id: number | null; cargo: string | null
  avatar_url: string | null; is_admin: boolean; notificacoes: { obrigatorio?: boolean; resposta?: boolean; semanal?: boolean }
}
export type Trilha = { id: string; slug: string; nome: string; descricao: string | null; cor: string; cor2: string; ordem: number }
export type Secao = { id: string; trilha_id: string; slug: string | null; nome: string; descricao: string | null; ordem: number }
export type Tipo = 'video' | 'slides' | 'pdf'
export type Conteudo = {
  id: string; secao_id: string; titulo: string; tipo: Tipo; formato: 'pilula' | 'treinamento'
  duracao_min: number | null; paginas: number | null; codigo: string | null; descricao: string | null; tags: string[]
  obrigatorio: boolean; publico_setores: number[]; embed_url: string | null; arquivo_path: string | null; thumb_url: string | null
  quiz_ativo: boolean; quiz_nota_min: number; quiz_sortear: number; quiz_tempo_min: number; quiz_espera_min: number
  quiz_gabarito: 'aprovado' | 'nunca' | 'sempre'; duvidas_ativas: boolean; publicado: boolean; autor: string | null
  created_at: string
}
export type Progresso = {
  user_id: string; conteudo_id: string; aberto_em: string; tempo_seg: number; status: 'aberto' | 'reprovado' | 'concluido'
  nota: number | null; tentativas: number; concluido_em: string | null; proxima_tentativa: string | null
}
export type Status = 'concluido' | 'quiz' | 'reprovado' | 'andamento' | 'novo'

export const TIPO: Record<Tipo, { n: string; i: string }> = {
  video: { n: 'Vídeo', i: 'video' },
  slides: { n: 'Slideshow', i: 'slides' },
  pdf: { n: 'PDF', i: 'pdf' },
}

export function status(c: Conteudo, p?: Progresso | null): Status {
  if (p?.status === 'concluido') return 'concluido'
  if (c.quiz_ativo) {
    if (p?.status === 'reprovado') return 'reprovado'
    return p ? 'quiz' : 'novo'
  }
  return p ? 'andamento' : 'novo'
}

export const obrigatorioPara = (c: Conteudo, prof?: Profile | null) =>
  c.obrigatorio && (c.publico_setores.length === 0 || (prof?.setor_id != null && c.publico_setores.includes(prof.setor_id)))

export const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '')
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
export const ini = (n?: string | null) => (n || '?').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
export const durTxt = (c: Pick<Conteudo, 'tipo' | 'duracao_min' | 'paginas'>) =>
  c.tipo === 'video' ? (c.duracao_min ? `${c.duracao_min} min` : 'vídeo') : c.paginas ? `${c.paginas} ${c.tipo === 'pdf' ? 'págs.' : 'slides'}` : TIPO[c.tipo].n

/* aceita o código <iframe> do SharePoint e devolve só o endereço */
export function embedSrc(v?: string | null) {
  v = (v || '').trim()
  const m = v.match(/src=["']([^"']+)["']/i)
  return m ? m[1].replace(/&amp;/g, '&') : v
}
export function urlHint(v?: string | null) {
  const u = embedSrc(v)
  if (!u) return 'No vídeo do SharePoint: Compartilhar → Incorporar → Copiar. Cole o código inteiro; o app guarda só o endereço.'
  if (/sharepoint\.com\/.*embed\.aspx/i.test(u)) return '✓ Código de incorporação do SharePoint reconhecido.'
  if (/sharepoint\.com/i.test(u)) return 'Este é o link de compartilhamento. Ele só abre o SharePoint; para tocar dentro da Universidade use Compartilhar → Incorporar.'
  return 'Endereço não é do SharePoint. Confira se colou o código certo.'
}
