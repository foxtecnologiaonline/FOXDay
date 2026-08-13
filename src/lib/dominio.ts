// Domínio do FOXDay — lógica pura, sem dependência de UI ou banco.

export type Classificacao = 'importante' | 'urgente' | 'circunstancial'
export type StatusTarefa = 'pendente' | 'concluida' | 'descartada'
export type Origem = 'texto' | 'voz'
export type StatusDelegacao = 'nao_delegada' | 'delegada' | 'cumprida' | 'nao_cumprida'

export interface Tarefa {
  id: string
  titulo: string
  data: string // AAAA-MM-DD
  classificacao: Classificacao
  status: StatusTarefa
  origem?: Origem
  criada_em: string
  concluida_em: string | null
  // Delegação
  delegada_para?: string | null
  prazo_delegacao?: string | null // AAAA-MM-DD
  status_delegacao?: StatusDelegacao
  // Rotina
  eh_rotina?: boolean
  dias_rotina?: number[] // 0=seg, 1=ter, ..., 6=dom
  rotina_id?: string | null
}

export interface Observacao {
  id: string
  texto: string
  data: string
  origem?: Origem
  criado_em: string
}

export const CLASSIFICACOES: Classificacao[] = ['importante', 'urgente', 'circunstancial']

export const ROTULO_CLASSIFICACAO: Record<Classificacao, string> = {
  importante: 'Importante',
  urgente: 'Urgente',
  circunstancial: 'Circunstancial',
}

const ORDEM: Record<Classificacao, number> = { importante: 0, urgente: 1, circunstancial: 2 }

// Pendentes primeiro (Importante > Urgente > Circunstancial, depois ordem de
// criação); concluídas ao final.
export function ordenarTarefas(tarefas: Tarefa[]): Tarefa[] {
  return [...tarefas].sort((a, b) => {
    const concluida = (t: Tarefa) => (t.status === 'concluida' ? 1 : 0)
    if (concluida(a) !== concluida(b)) return concluida(a) - concluida(b)
    if (ORDEM[a.classificacao] !== ORDEM[b.classificacao]) {
      return ORDEM[a.classificacao] - ORDEM[b.classificacao]
    }
    return a.criada_em.localeCompare(b.criada_em)
  })
}

// Tarefas pendentes de dias anteriores — entram na triagem do dia
// (reagendar para hoje / manter na data / descartar).
export function pendentesAnteriores(tarefas: Tarefa[], hoje: string): Tarefa[] {
  return ordenarTarefas(tarefas.filter((t) => t.status === 'pendente' && t.data < hoje))
}

export interface ResumoClassificacao {
  planejadas: number
  concluidas: number
}

export interface ResumoDia {
  planejadas: number
  concluidas: number
  percentual: number // 0–100
  porClassificacao: Record<Classificacao, ResumoClassificacao>
}

// Resumo do dia para o relatório: descartadas ficam fora do planejado.
export function calcularResumo(tarefas: Tarefa[]): ResumoDia {
  const validas = tarefas.filter((t) => t.status !== 'descartada')
  const resumo: ResumoDia = {
    planejadas: validas.length,
    concluidas: 0,
    percentual: 0,
    porClassificacao: {
      importante: { planejadas: 0, concluidas: 0 },
      urgente: { planejadas: 0, concluidas: 0 },
      circunstancial: { planejadas: 0, concluidas: 0 },
    },
  }
  for (const t of validas) {
    resumo.porClassificacao[t.classificacao].planejadas++
    if (t.status === 'concluida') {
      resumo.concluidas++
      resumo.porClassificacao[t.classificacao].concluidas++
    }
  }
  resumo.percentual =
    resumo.planejadas === 0 ? 0 : Math.round((resumo.concluidas / resumo.planejadas) * 100)
  return resumo
}
