import { createClient } from '@supabase/supabase-js'
import { classificarErro, ehErroRetentavel, type ErroFoxDay } from './erros'
import { log } from './log'
import { buscarTarefasDoDb, salvarTarefaNoDb, enfileirarOperacao } from './db'
import type { Tarefa } from './dominio'

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

// ─────────────────────────────────────────────────────────────────────────────
// Wrappers com suporte a cache offline

interface OpcoesCacheOffline {
  tentativasMax?: number
  delay?: number
  cache?: boolean
}

/**
 * Lê tarefas com suporte a cache offline.
 * Se offline: retorna do IndexedDB se disponível
 * Se online: busca do Supabase e copia para IndexedDB
 */
export async function buscarTarefasComCache(
  data: string,
  _opcoes: OpcoesCacheOffline = {}
): Promise<{ data: Tarefa[] | null; erro?: ErroFoxDay }> {
  const online = navigator.onLine

  // Se online, buscar do Supabase normalmente
  if (online) {
    const { data: tarefas, erro } = await supabaseCall<Tarefa[]>(async () => {
      return supabase.from('tarefa').select('*').eq('data', data).neq('status', 'descartada')
    })

    // Se sucesso, salvar no cache
    if (tarefas) {
      try {
        for (const t of tarefas) {
          await salvarTarefaNoDb(t)
        }
      } catch (cacheErro) {
        log('Erro ao cachear tarefas', {
          erro: cacheErro instanceof Error ? cacheErro.message : String(cacheErro),
        })
      }
    }

    return { data: tarefas, erro }
  }

  // Se offline, tentar carregar do cache
  try {
    const tarefas = await buscarTarefasDoDb(data)
    if (tarefas.length > 0) {
      log(`Carregou ${tarefas.length} tarefas do cache (offline)`, { data })
      return { data: tarefas }
    }
  } catch (cacheErro) {
    log('Erro ao ler cache', {
      erro: cacheErro instanceof Error ? cacheErro.message : String(cacheErro),
    })
  }

  // Offline e cache vazio
  return {
    data: null,
    erro: {
      tipo: 'rede' as any,
      mensagem: 'Sem conexão e nenhum dado em cache',
      detalhes: 'Conecte para sincronizar',
    },
  }
}

/**
 * Atualiza tarefa com suporte a operações offline.
 * Se online: atualiza no Supabase imediatamente
 * Se offline: salva localmente e enfileira para sincronizar depois
 */
export async function atualizarTarefaComOffline(
  id: string,
  updates: Partial<Tarefa>,
  _opcoes: OpcoesCacheOffline = {}
): Promise<{ data: boolean; erro?: ErroFoxDay }> {
  const online = navigator.onLine

  // Buscar tarefa atual do cache/Supabase
  let tarefaAtual: Tarefa | null = null
  try {
    const { data } = await supabase
      .from('tarefa')
      .select('*')
      .eq('id', id)
      .single()
      .then((r) => ({ data: r.data, error: r.error }))

    tarefaAtual = data
  } catch (erro) {
    log('Erro ao buscar tarefa para atualizar', { tarefaId: id })
  }

  if (!tarefaAtual) {
    return {
      data: false,
      erro: {
        tipo: 'banco_dados' as any,
        mensagem: 'Tarefa não encontrada',
      },
    }
  }

  const tarefaAtualizada = { ...tarefaAtual, ...updates }

  // Se online: atualizar no Supabase
  if (online) {
    const { erro } = await supabaseCall<any>(async () => {
      return supabase.from('tarefa').update(updates).eq('id', id)
    })

    if (!erro) {
      // Sucesso: atualizar cache também
      try {
        await salvarTarefaNoDb(tarefaAtualizada)
      } catch (cacheErro) {
        log('Erro ao atualizar cache', {
          erro: cacheErro instanceof Error ? cacheErro.message : String(cacheErro),
        })
      }
      return { data: true }
    }

    return { data: false, erro }
  }

  // Se offline: salvar localmente e enfileirar
  try {
    await salvarTarefaNoDb(tarefaAtualizada)
    await enfileirarOperacao({
      operacao: 'UPDATE',
      payload: tarefaAtualizada,
      tentativas: 0,
      criado_em: new Date().toISOString(),
    })

    log('Tarefa atualizada offline — será sincronizada depois', { tarefaId: id })
    return { data: true }
  } catch (dbErro) {
    return {
      data: false,
      erro: {
        tipo: 'desconhecido' as any,
        mensagem: 'Erro ao salvar offline',
        detalhes: dbErro instanceof Error ? dbErro.message : String(dbErro),
      },
    }
  }
}
