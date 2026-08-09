import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  inicializarDb,
  buscarTarefasDoDb,
  salvarTarefaNoDb,
  deletarTarefaDoDb,
  enfileirarOperacao,
  obterFilaSincronizacao,
  limparOperacaoDaFila,
  incrementarTentativasOperacao,
  salvarMetadado,
  obterMetadado,
  obterUltimoSync,
  salvarUltimoSync,
  limparTodosBancos,
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

describe('Database (IndexedDB)', () => {
  beforeEach(async () => {
    await inicializarDb()
    await limparTodosBancos()
  })

  afterEach(async () => {
    await limparTodosBancos()
  })

  describe('buscarTarefasDoDb', () => {
    it('retorna [] se não existem tarefas', async () => {
      const resultado = await buscarTarefasDoDb('2026-08-09')
      expect(resultado).toEqual([])
    })

    it('retorna tarefas salvas para uma data específica', async () => {
      const t1 = tarefaMock({ data: '2026-08-09' })
      const t2 = tarefaMock({ data: '2026-08-09' })
      const t3 = tarefaMock({ data: '2026-08-10' })

      await salvarTarefaNoDb(t1)
      await salvarTarefaNoDb(t2)
      await salvarTarefaNoDb(t3)

      const resultado = await buscarTarefasDoDb('2026-08-09')
      expect(resultado).toHaveLength(2)
      expect(resultado.map((t) => t.id)).toContain(t1.id)
      expect(resultado.map((t) => t.id)).toContain(t2.id)
      expect(resultado.map((t) => t.id)).not.toContain(t3.id)
    })
  })

  describe('salvarTarefaNoDb', () => {
    it('persiste tarefa em IndexedDB', async () => {
      const t = tarefaMock()
      await salvarTarefaNoDb(t)

      const resultado = await buscarTarefasDoDb(t.data)
      expect(resultado).toHaveLength(1)
      expect(resultado[0].id).toBe(t.id)
      expect(resultado[0].titulo).toBe(t.titulo)
    })

    it('atualiza tarefa existente', async () => {
      const t = tarefaMock()
      await salvarTarefaNoDb(t)

      const atualizada = { ...t, titulo: 'Título novo' }
      await salvarTarefaNoDb(atualizada)

      const resultado = await buscarTarefasDoDb(t.data)
      expect(resultado).toHaveLength(1)
      expect(resultado[0].titulo).toBe('Título novo')
    })
  })

  describe('deletarTarefaDoDb', () => {
    it('remove tarefa do banco', async () => {
      const t = tarefaMock()
      await salvarTarefaNoDb(t)

      let resultado = await buscarTarefasDoDb(t.data)
      expect(resultado).toHaveLength(1)

      await deletarTarefaDoDb(t.id)

      resultado = await buscarTarefasDoDb(t.data)
      expect(resultado).toHaveLength(0)
    })
  })

  describe('enfileirarOperacao', () => {
    it('cria entrada na fila de sincronização', async () => {
      const t = tarefaMock()
      const id = await enfileirarOperacao({
        operacao: 'CREATE',
        payload: t,
        tentativas: 0,
        criado_em: new Date().toISOString(),
      })

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')

      const fila = await obterFilaSincronizacao()
      expect(fila).toHaveLength(1)
      expect(fila[0].operacao).toBe('CREATE')
      expect(fila[0].payload.id).toBe(t.id)
    })
  })

  describe('obterFilaSincronizacao', () => {
    it('retorna [] se fila vazia', async () => {
      const fila = await obterFilaSincronizacao()
      expect(fila).toEqual([])
    })

    it('retorna todas as operações enfileiradas', async () => {
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
        tentativas: 1,
        criado_em: new Date().toISOString(),
      })

      const fila = await obterFilaSincronizacao()
      expect(fila).toHaveLength(2)
      expect(fila[0].operacao).toBe('CREATE')
      expect(fila[1].operacao).toBe('UPDATE')
    })
  })

  describe('limparOperacaoDaFila', () => {
    it('remove operação da fila', async () => {
      const t = tarefaMock()
      const opId = await enfileirarOperacao({
        operacao: 'CREATE',
        payload: t,
        tentativas: 0,
        criado_em: new Date().toISOString(),
      })

      let fila = await obterFilaSincronizacao()
      expect(fila).toHaveLength(1)

      await limparOperacaoDaFila(opId)

      fila = await obterFilaSincronizacao()
      expect(fila).toHaveLength(0)
    })
  })

  describe('incrementarTentativasOperacao', () => {
    it('incrementa contador de tentativas', async () => {
      const t = tarefaMock()
      const opId = await enfileirarOperacao({
        operacao: 'UPDATE',
        payload: t,
        tentativas: 0,
        criado_em: new Date().toISOString(),
      })

      let fila = await obterFilaSincronizacao()
      expect(fila[0].tentativas).toBe(0)

      await incrementarTentativasOperacao(opId)

      fila = await obterFilaSincronizacao()
      expect(fila[0].tentativas).toBe(1)
    })
  })

  describe('Metadados', () => {
    it('salva e recupera metadados', async () => {
      await salvarMetadado('chave-teste', { valor: 'teste' })
      const resultado = await obterMetadado('chave-teste')
      expect(resultado).toEqual({ valor: 'teste' })
    })

    it('retorna null se metadado não existe', async () => {
      const resultado = await obterMetadado('nao-existe')
      expect(resultado).toBeNull()
    })

    it('salva e recupera último sync', async () => {
      const agora = new Date()
      await salvarUltimoSync(agora)
      const ultimo = await obterUltimoSync()
      expect(ultimo).toBeDefined()
      expect(Math.abs(ultimo!.getTime() - agora.getTime())).toBeLessThan(1000)
    })

    it('obterUltimoSync retorna null se nunca sincronizou', async () => {
      const ultimo = await obterUltimoSync()
      expect(ultimo).toBeNull()
    })
  })

  describe('limparTodosBancos', () => {
    it('remove todos os dados', async () => {
      const t = tarefaMock()
      await salvarTarefaNoDb(t)
      await enfileirarOperacao({
        operacao: 'CREATE',
        payload: t,
        tentativas: 0,
        criado_em: new Date().toISOString(),
      })
      await salvarMetadado('teste', 'valor')

      await limparTodosBancos()

      const tarefas = await buscarTarefasDoDb(t.data)
      const fila = await obterFilaSincronizacao()
      const meta = await obterMetadado('teste')

      expect(tarefas).toEqual([])
      expect(fila).toEqual([])
      expect(meta).toBeNull()
    })
  })
})
