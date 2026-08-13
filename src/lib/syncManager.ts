// Gerenciador de fila de sincronização offline → online
import { supabase, supabaseCall } from './supabase'
import {
  obterFilaSincronizacao,
  limparOperacaoDaFila,
  incrementarTentativasOperacao,
  salvarUltimoSync,
  type EnfileiradoSync,
} from './db'
import { log } from './log'

const TENTATIVAS_MAX = 3

export interface ResultadoSync {
  total: number
  sucesso: number
  erro: number
  detalhes: string[]
}

export async function sincronizarFila(): Promise<ResultadoSync> {
  const fila = await obterFilaSincronizacao()
  const resultado: ResultadoSync = {
    total: fila.length,
    sucesso: 0,
    erro: 0,
    detalhes: [],
  }

  if (fila.length === 0) {
    log('Fila de sincronização vazia')
    await salvarUltimoSync()
    return resultado
  }

  log(`Iniciando sincronização de ${fila.length} operações`)

  for (const operacao of fila) {
    try {
      const ok = await executarOperacao(operacao)

      if (ok) {
        await limparOperacaoDaFila(operacao.id)
        resultado.sucesso++
        log(`✓ Operação ${operacao.id} sincronizada com sucesso`)
      } else {
        resultado.erro++
        resultado.detalhes.push(`Erro ao sincronizar ${operacao.id}`)

        if (operacao.tentativas >= TENTATIVAS_MAX) {
          log(`✗ Operação ${operacao.id} falhou ${TENTATIVAS_MAX} vezes — desistindo`, {
            operacao: operacao.operacao,
            tarefaId: operacao.payload.id,
          })
        } else {
          await incrementarTentativasOperacao(operacao.id)
        }
      }
    } catch (erro) {
      resultado.erro++
      const mensagem = erro instanceof Error ? erro.message : String(erro)
      resultado.detalhes.push(`Exceção ao sincronizar ${operacao.id}: ${mensagem}`)
      log(`Exceção ao sincronizar operação ${operacao.id}`, {
        erro: mensagem,
        operacao: operacao.operacao,
      })

      if (operacao.tentativas < TENTATIVAS_MAX) {
        await incrementarTentativasOperacao(operacao.id)
      }
    }
  }

  // Atualizar timestamp de último sync bem-sucedido
  await salvarUltimoSync()

  const resumo = `Sincronização completa: ${resultado.sucesso}/${resultado.total} sucesso, ${resultado.erro} erro`
  log(resumo)

  return resultado
}

async function executarOperacao(op: EnfileiradoSync): Promise<boolean> {
  const { operacao, payload } = op

  try {
    if (operacao === 'CREATE') {
      const { erro } = await supabaseCall(async () => {
        return supabase.from('tarefa').insert([payload])
      })
      return !erro
    }

    if (operacao === 'UPDATE') {
      const { erro } = await supabaseCall(async () => {
        const { id, ...dados } = payload
        return supabase.from('tarefa').update(dados).eq('id', id)
      })
      return !erro
    }

    if (operacao === 'DELETE') {
      const { erro } = await supabaseCall(async () => {
        return supabase.from('tarefa').delete().eq('id', payload.id)
      })
      return !erro
    }

    log(`Operação desconhecida: ${operacao}`, { tarefaId: payload.id })
    return false
  } catch (erro) {
    log(`Exceção ao executar operação ${operacao}`, {
      tarefaId: payload.id,
      erro: erro instanceof Error ? erro.message : String(erro),
    })
    return false
  }
}

export async function registrarSyncEmBackground(): Promise<void> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      const syncManager = (registration as any).sync as SyncManager | undefined
      if (syncManager) {
        await syncManager.register('foxday-sync')
        log('Background Sync API registrado')
      }
    } catch (erro) {
      log('Não foi possível registrar Background Sync', {
        erro: erro instanceof Error ? erro.message : String(erro),
      })
    }
  }
}

interface SyncManager {
  register(tag: string): Promise<void>
}

export function escutarEventosDeConexao(): void {
  window.addEventListener('foxday-online', async () => {
    log('Evento online detectado — sincronizando fila')
    await sincronizarFila()
    // Dispara evento de sucesso para componentes atualizarem
    window.dispatchEvent(new Event('foxday-sync-complete'))
  })
}
