import { useCallback } from 'react'
import { getClaudeClient, isClaudeClientInitialized } from '../lib/claude'
import type { InterpretacaoVoz } from '../lib/claude'
import { logErro } from '../lib/log'

export function useInterpretarVoz() {
  const interpretar = useCallback(async (transcricao: string): Promise<InterpretacaoVoz> => {
    if (!isClaudeClientInitialized()) {
      logErro('useInterpretarVoz', new Error('Claude client not initialized'))
      return {
        texto: transcricao,
        classificacao: 'importante',
        data: 'hoje',
        confianca: 0,
      }
    }

    try {
      const claudeClient = getClaudeClient()
      const resultado = await claudeClient.interpretarVoz(transcricao)
      return resultado
    } catch (e) {
      logErro('useInterpretarVoz.interpretar', e as Error)
      return {
        texto: transcricao,
        classificacao: 'importante',
        data: 'hoje',
        confianca: 0,
      }
    }
  }, [])

  return { interpretar }
}
