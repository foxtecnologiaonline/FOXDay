// Abstração de IndexedDB para persistência offline
import type { Tarefa } from './dominio'

export type OperacaoSync = 'CREATE' | 'UPDATE' | 'DELETE'

export interface EnfileiradoSync {
  id: string
  operacao: OperacaoSync
  payload: Tarefa
  tentativas: number
  criado_em: string
}

interface Metadados {
  chave: string
  valor: any
}

const DB_NAME = 'foxday-offline'
const DB_VERSION = 1

const STORE_TAREFAS = 'tarefas'
const STORE_SINCRONIZAR = 'sincronizar'
const STORE_METADADOS = 'metadados'

let db: IDBDatabase | null = null

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error(`Erro ao abrir IndexedDB: ${request.error}`))
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      if (!database.objectStoreNames.contains(STORE_TAREFAS)) {
        const storeTarefas = database.createObjectStore(STORE_TAREFAS, { keyPath: 'id' })
        storeTarefas.createIndex('data', 'data', { unique: false })
      }

      if (!database.objectStoreNames.contains(STORE_SINCRONIZAR)) {
        const storeSincronizar = database.createObjectStore(STORE_SINCRONIZAR, { keyPath: 'id' })
        storeSincronizar.createIndex('criado_em', 'criado_em', { unique: false })
      }

      if (!database.objectStoreNames.contains(STORE_METADADOS)) {
        database.createObjectStore(STORE_METADADOS, { keyPath: 'chave' })
      }
    }
  })
}

export async function inicializarDb(): Promise<void> {
  try {
    await abrirDb()
  } catch (erro) {
    console.error('Falha ao inicializar banco offline:', erro)
  }
}

export async function buscarTarefasDoDb(data: string): Promise<Tarefa[]> {
  const database = await abrirDb()
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_TAREFAS], 'readonly')
    const store = tx.objectStore(STORE_TAREFAS)
    const index = store.index('data')
    const request = index.getAll(data)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve((request.result as Tarefa[]) || [])
  })
}

export async function salvarTarefaNoDb(tarefa: Tarefa): Promise<void> {
  const database = await abrirDb()
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_TAREFAS], 'readwrite')
    const store = tx.objectStore(STORE_TAREFAS)
    const request = store.put(tarefa)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function deletarTarefaDoDb(tarefaId: string): Promise<void> {
  const database = await abrirDb()
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_TAREFAS], 'readwrite')
    const store = tx.objectStore(STORE_TAREFAS)
    const request = store.delete(tarefaId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function enfileirarOperacao(op: Omit<EnfileiradoSync, 'id'>): Promise<string> {
  const database = await abrirDb()
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const enfileirada: EnfileiradoSync = { ...op, id }

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_SINCRONIZAR], 'readwrite')
    const store = tx.objectStore(STORE_SINCRONIZAR)
    const request = store.add(enfileirada)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(id)
  })
}

export async function obterFilaSincronizacao(): Promise<EnfileiradoSync[]> {
  const database = await abrirDb()
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_SINCRONIZAR], 'readonly')
    const store = tx.objectStore(STORE_SINCRONIZAR)
    const index = store.index('criado_em')
    const request = index.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve((request.result as EnfileiradoSync[]) || [])
  })
}

export async function limparOperacaoDaFila(operacaoId: string): Promise<void> {
  const database = await abrirDb()
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_SINCRONIZAR], 'readwrite')
    const store = tx.objectStore(STORE_SINCRONIZAR)
    const request = store.delete(operacaoId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function incrementarTentativasOperacao(operacaoId: string): Promise<void> {
  const database = await abrirDb()
  return new Promise(async (resolve, reject) => {
    const tx = database.transaction([STORE_SINCRONIZAR], 'readwrite')
    const store = tx.objectStore(STORE_SINCRONIZAR)
    const getRequest = store.get(operacaoId)

    getRequest.onsuccess = () => {
      const operacao = getRequest.result as EnfileiradoSync | undefined
      if (operacao) {
        operacao.tentativas++
        const updateRequest = store.put(operacao)
        updateRequest.onerror = () => reject(updateRequest.error)
        updateRequest.onsuccess = () => resolve()
      } else {
        resolve()
      }
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function salvarMetadado(chave: string, valor: any): Promise<void> {
  const database = await abrirDb()
  const metadado: Metadados = { chave, valor }

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_METADADOS], 'readwrite')
    const store = tx.objectStore(STORE_METADADOS)
    const request = store.put(metadado)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function obterMetadado<T>(chave: string): Promise<T | null> {
  const database = await abrirDb()
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_METADADOS], 'readonly')
    const store = tx.objectStore(STORE_METADADOS)
    const request = store.get(chave)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const resultado = request.result as Metadados | undefined
      resolve((resultado?.valor as T) || null)
    }
  })
}

export async function obterUltimoSync(): Promise<Date | null> {
  const timestamp = await obterMetadado<string>('ultimo_sync')
  return timestamp ? new Date(timestamp) : null
}

export async function salvarUltimoSync(data: Date = new Date()): Promise<void> {
  await salvarMetadado('ultimo_sync', data.toISOString())
}

export async function limparTodosBancos(): Promise<void> {
  const database = await abrirDb()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(
      [STORE_TAREFAS, STORE_SINCRONIZAR, STORE_METADADOS],
      'readwrite'
    )

    tx.objectStore(STORE_TAREFAS).clear()
    tx.objectStore(STORE_SINCRONIZAR).clear()
    tx.objectStore(STORE_METADADOS).clear()

    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve()
  })
}
