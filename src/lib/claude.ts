import type { Classificacao, Tarefa } from './dominio'

export interface InterpretacaoVoz {
  texto: string
  classificacao: Classificacao
  data: 'hoje' | 'amanha'
  confianca: number
}

interface ClaudeConfig {
  apiKey: string
  baseUrl: string
}

export class APIClaudeClient {
  private config: ClaudeConfig

  constructor(apiKey: string) {
    this.config = {
      apiKey,
      baseUrl: 'https://api.anthropic.com/v1',
    }
  }

  /**
   * Interpreta texto de voz e extrai: tarefa, classificação, data
   *
   * Exemplo:
   *   "ligar pro contador amanhã 9h importante"
   *   → { texto: "ligar pro contador", classificacao: "importante", data: "amanha", confianca: 95 }
   *
   * @param texto Transcrição de voz em português
   * @returns Interpretação estruturada (stub retorna baixa confiança até implementar)
   */
  async interpretarVoz(texto: string): Promise<InterpretacaoVoz> {
    // TODO: Implementar em Fase 2
    // Por enquanto, retornar estrutura com confiança baixa (0)
    return {
      texto,
      classificacao: 'importante',
      data: 'hoje',
      confianca: 0,
    }
  }

  /**
   * Gera insights sobre padrão de tarefas
   *
   * Exemplo:
   *   [tarefas dos últimos 30 dias]
   *   → "Você conclui 80% de tarefas importantes, concentra 60% do trabalho às manhãs"
   *
   * @param historico Lista de tarefas do histórico
   * @returns String com insights em português (stub vazio)
   */
  async gerarInsights(_historico: Tarefa[]): Promise<string> {
    // TODO: Implementar em Fase 2
    return ''
  }

  /**
   * Sugeridor de próximas ações baseado em padrões
   *
   * Exemplo:
   *   "Você não contactou o cliente X há 5 dias, considerando fazer isso?"
   *
   * @param historico Histórico de tarefas
   * @returns Sugestões estruturadas (stub vazio)
   */
  async sugerirAcoes(_historico: Tarefa[]): Promise<string> {
    // TODO: Implementar em Fase 2
    return ''
  }
}

// Singleton global
let claudeClient: APIClaudeClient | null = null

export function initClaudeClient(apiKey: string): void {
  claudeClient = new APIClaudeClient(apiKey)
}

export function getClaudeClient(): APIClaudeClient {
  if (!claudeClient) {
    throw new Error(
      'Claude client not initialized. Call initClaudeClient(apiKey) in App.tsx during auth setup'
    )
  }
  return claudeClient
}

export function isClaudeClientInitialized(): boolean {
  return claudeClient !== null
}
