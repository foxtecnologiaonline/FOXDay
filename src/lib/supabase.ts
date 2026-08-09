import { createClient } from '@supabase/supabase-js'
import { classificarErro, ehErroRetentavel, type ErroFoxDay } from './erros'
import { log } from './log'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Quando não configurado, o App mostra instruções em vez das telas.
export const supabaseConfigurado = Boolean(url && chave)

export const supabase = createClient(
  url ?? 'https://nao-configurado.supabase.co',
  chave ?? 'nao-configurado'
)

// ─────────────────────────────────────────────────────────────────────────────
// Wrapper com retry automático e tratamento de erros

interface OpcoesChamada {
  tentativasMax?: number
  delay?: number
}

const DELAY_PADRAO = 500 // ms
const TENTATIVAS_PADRAO = 3

/**
 * Executa uma operação Supabase com retry automático para erros retentáveis.
 * Classifica o erro e loga informações estruturadas.
 *
 * Exemplo:
 *   const { data, erro } = await supabaseCall(async () => {
 *     return supabase.from('tarefa').select('*').eq('data', '2026-08-08')
 *   })
 */
export async function supabaseCall<T>(
  operacao: () => Promise<{ data: T | null; error: any }>,
  opcoes: OpcoesChamada = {}
): Promise<{ data: T | null; erro?: ErroFoxDay }> {
  const { tentativasMax = TENTATIVAS_PADRAO, delay = DELAY_PADRAO } = opcoes
  let ultimoErro: any = null

  for (let tentativa = 1; tentativa <= tentativasMax; tentativa++) {
    try {
      const resultado = await operacao()

      if (resultado.error) {
        ultimoErro = resultado.error
        const erroClassificado = classificarErro(resultado.error)

        log(`Supabase error: ${erroClassificado.tipo}`, {
          mensagem: erroClassificado.mensagem,
          detalhes: erroClassificado.detalhes,
          tentativa,
          retentavel: ehErroRetentavel(erroClassificado),
        })

        // Se é retentável e não é última tentativa, tenta novamente
        if (ehErroRetentavel(erroClassificado) && tentativa < tentativasMax) {
          const delayExponencial = delay * Math.pow(2, tentativa - 1)
          log(`Retry ${tentativa}/${tentativasMax} em ${delayExponencial}ms`)
          await new Promise((r) => setTimeout(r, delayExponencial))
          continue
        }

        // Erro final ou não retentável
        return {
          data: null,
          erro: { ...erroClassificado, tentativa },
        }
      }

      // Sucesso
      if (tentativa > 1) {
        log(`Supabase operação com sucesso após ${tentativa} tentativas`)
      }
      return { data: resultado.data as T }
    } catch (err) {
      ultimoErro = err
      const erroClassificado = classificarErro(err)

      log(`Supabase exception: ${erroClassificado.tipo}`, {
        mensagem: erroClassificado.mensagem,
        detalhes: erroClassificado.detalhes,
        tentativa,
        retentavel: ehErroRetentavel(erroClassificado),
      })

      if (ehErroRetentavel(erroClassificado) && tentativa < tentativasMax) {
        const delayExponencial = delay * Math.pow(2, tentativa - 1)
        log(`Retry ${tentativa}/${tentativasMax} em ${delayExponencial}ms`)
        await new Promise((r) => setTimeout(r, delayExponencial))
        continue
      }

      return {
        data: null,
        erro: { ...erroClassificado, tentativa },
      }
    }
  }

  // Nunca deve chegar aqui, mas para TypeScript ficar feliz
  return {
    data: null,
    erro: classificarErro(ultimoErro),
  }
}
