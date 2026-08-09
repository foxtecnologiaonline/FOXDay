import type { Classificacao, Tarefa } from './dominio'
import { logErro } from './log'

export interface InterpretacaoVoz {
  texto: string
  classificacao: Classificacao
  data: 'hoje' | 'amanha'
  confianca: number
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>
}

export class APIClaudeClient {
  private apiKey: string
  private baseUrl = 'https://api.anthropic.com/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Interpreta texto de voz e extrai: tarefa, classificação, data
   *
   * Exemplo:
   *   "ligar pro contador amanhã 9h importante"
   *   → { texto: "ligar pro contador", classificacao: "importante", data: "amanha", confianca: 95 }
   *
   * @param texto Transcrição de voz em português
   * @returns Interpretação estruturada
   */
  async interpretarVoz(texto: string): Promise<InterpretacaoVoz> {
    try {
      const prompt = `Você é um assistente especializado em interpretar tarefas faladas em português brasileiro.

O usuário fala uma tarefa em linguagem natural. Você deve extrair:
1. **Tarefa** (string): descrição concisa da tarefa
2. **Classificação** (importante | urgente | circunstancial): baseado em contexto
3. **Data** (hoje | amanha): quando fazer (procure por palavras como "amanhã", "dia que vem", "próximo dia")
4. **Confiança** (0-100): seu nível de certeza na interpretação

Responda em JSON válido (APENAS o JSON, sem markdown code blocks):
{
  "tarefa": "...",
  "classificacao": "...",
  "data": "...",
  "confianca": 90
}

Entrada do usuário: "${texto}"`

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 256,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`)
      }

      const data = (await response.json()) as ClaudeResponse
      const textContent = data.content.find((c) => c.type === 'text')?.text || '{}'

      const parsed = JSON.parse(textContent)

      return {
        texto: parsed.tarefa || texto,
        classificacao: (['importante', 'urgente', 'circunstancial'].includes(parsed.classificacao)
          ? parsed.classificacao
          : 'importante') as Classificacao,
        data: parsed.data === 'amanha' ? 'amanha' : 'hoje',
        confianca: Math.min(100, Math.max(0, parsed.confianca || 70)),
      }
    } catch (e) {
      logErro('APIClaudeClient.interpretarVoz', e as Error)
      // Fallback: retornar interpretação conservadora
      return {
        texto,
        classificacao: 'importante',
        data: 'hoje',
        confianca: 0,
      }
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
