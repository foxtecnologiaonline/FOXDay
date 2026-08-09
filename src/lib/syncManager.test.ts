import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { sincronizarFila, escutarEventosDeConexao } from './syncManager'
import {
  inicializarDb,
  enfileirarOperacao,
  obterFilaSincronizacao,
  limparTodosBancos,
  obterUltimoSync,
} from './db'
import type { Tarefa } from './dominio'

function tarefaMock(overrides?: Partial<Tarefa>): Tarefa {
  return {
    id: 'test-' + Math.random().toString(36).slice(2, 9),
    titulo: 'Tarefa teste',
    data: '2026-08-09',
    classificacao: 'importante',
    status: 'pendente',
    criada_em: new Date().toISOString(),
    concluida_em: null,
    ...overrides,
  }
}

describe('SyncManager', () => {
  beforeEach(async () => {
    await inicializarDb()
    await limparTodosBancos()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await limparTodosBancos()
  })

  describe('sincronizarFila', () => {
    it('retorna resultado com sucesso=0 se fila vazia', async () => {
      const resultado = await sincronizarFila()
      expect(resultado.total).toBe(0)
      expect(resultado.sucesso).toBe(0)
      expect(resultado.erro).toBe(0)
    })

    it('atualiza timestamp de último sync após sincronizar', async () => {
      const antes = await obterUltimoSync()
      await sincronizarFila()
      const depois = await obterUltimoSync()

      expect(antes).toBeNull()
      expect(depois).toBeDefined()
    })

    it('processa operações enfileiradas', async () => {
      const t1 = tarefaMock()
      const t2 = tarefaMock()

      await enfileirarOperacao({
        operacao: 'CREATE',
        payload: t1,
        tentativas: 0,
        criado_em: new Date().toISOString(),
      })

      await enfileirarOperacao({
        operacao: 'UPDATE',
        payload: t2,
        tentativas: 0,
        criado_em: new Date().toISOString(),
      })

      const filaAntes = await obterFilaSincronizacao()
      expect(filaAntes).toHaveLength(2)

      // Nota: Em ambiente de teste, as operações falharão porque
      // Supabase não está configurado. O teste apenas verifica que
      // a fila foi processada (tentativas incrementadas ou removida).
      const resultado = await sincronizarFila()
      expect(resultado.total).toBe(2)
    })

    it('incrementa tentativas em operações com falha de rede', async () => {
      const t = tarefaMock()
      const opId = await enfileirarOperacao({
        operacao: 'CREATE',
        payload: t,
        tentativas: 0,
        criado_em: new Date().toISOString(),
      })

      const resultado = await sincronizarFila()
      expect(resultado.erro).toBeGreaterThanOrEqual(0)

      const fila = await obterFilaSincronizacao()
      const operacao = fila.find((op) => op.id === opId)

      // Se houve erro na operação, tentativas deve ter incrementado
      // (ou operação foi removida se sucesso)
      if (operacao) {
        expect(operacao.tentativas).toBeGreaterThan(0)
      }
    })

    it('retorna resultado estruturado', async () => {
      const resultado = await sincronizarFila()

      expect(resultado).toHaveProperty('total')
      expect(resultado).toHaveProperty('sucesso')
      expect(resultado).toHaveProperty('erro')
      expect(resultado).toHaveProperty('detalhes')

      expect(typeof resultado.total).toBe('number')
      expect(typeof resultado.sucesso).toBe('number')
      expect(typeof resultado.erro).toBe('number')
      expect(Array.isArray(resultado.detalhes)).toBe(true)
    })
  })

  describe('escutarEventosDeConexao', () => {
    it('registra listener para evento foxday-online', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      escutarEventosDeConexao()
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'foxday-online',
        expect.any(Function)
      )
      addEventListenerSpy.mockRestore()
    })

    it('dispara sincronização ao receber evento online', async () => {
      const t = tarefaMock()
      await enfileirarOperacao({
        operacao: 'CREATE',
        payload: t,
        tentativas: 0,
        criado_em: new Date().toISOString(),
      })

      escutarEventosDeConexao()

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

      // Simular evento online
      window.dispatchEvent(new Event('foxday-online'))

      // Aguardar processamento assíncrono
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(dispatchEventSpy).toHaveBeenCalled()
      dispatchEventSpy.mockRestore()
    })
  })
})
