// Mock IndexedDB para testes (jsdom não suporta IndexedDB nativamente)
import { beforeAll } from 'vitest'

// Estrutura básica de dados para o mock
const stores: Record<string, Map<string, any>> = {}
const indices: Record<string, Record<string, string>> = {}

class MockDOMStringList {
  constructor(private items: string[]) {}

  get length() {
    return this.items.length
  }

  contains(name: string) {
    return this.items.includes(name)
  }

  item(index: number) {
    return this.items[index] || null
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]()
  }
}

class MockIDBRequest {
  onsuccess: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  private result_: any

  constructor(result?: any) {
    this.result_ = result
    // Simular comportamento assíncrono
    setTimeout(() => {
      if (this.onsuccess) {
        this.onsuccess({ target: this })
      }
    }, 0)
  }

  get result() {
    return this.result_
  }

  set result(value: any) {
    this.result_ = value
  }

  get error() {
    return null
  }
}

class MockIDBIndex {
  constructor(private storeName: string, private keyPath: string) {}

  getAll(value?: any) {
    const store = stores[this.storeName] || new Map()
    const results = Array.from(store.values()).filter((item) => {
      if (value === undefined) return true
      return (item as any)[this.keyPath] === value
    })
    return new MockIDBRequest(results)
  }

  get(value: any) {
    const store = stores[this.storeName] || new Map()
    const result = Array.from(store.values()).find((item) => (item as any)[this.keyPath] === value)
    return new MockIDBRequest(result)
  }
}

class MockIDBObjectStore {
  private name_: string
  private indices_: Record<string, MockIDBIndex> = {}

  constructor(name: string) {
    this.name_ = name
  }

  index(name: string) {
    if (!this.indices_[name]) {
      const keyPath = indices[this.name_]?.[name] || name
      this.indices_[name] = new MockIDBIndex(this.name_, keyPath)
    }
    return this.indices_[name]
  }

  createIndex(name: string, keyPath: string) {
    this.indices_[name] = new MockIDBIndex(this.name_, keyPath)
    if (!indices[this.name_]) indices[this.name_] = {}
    indices[this.name_][name] = keyPath
    return this.indices_[name]
  }

  getAll() {
    const store = stores[this.name_] || new Map()
    return new MockIDBRequest(Array.from(store.values()))
  }

  get(key: string) {
    const result = (stores[this.name_] || new Map()).get(key)
    return new MockIDBRequest(result)
  }

  put(value: any) {
    const key = value.id || value.chave
    ;(stores[this.name_] ??= new Map()).set(key, value)
    return new MockIDBRequest(key)
  }

  add(value: any) {
    const key = value.id
    if (!key) throw new Error('Missing key')
    ;(stores[this.name_] ??= new Map()).set(key, value)
    return new MockIDBRequest(key)
  }

  delete(key: string) {
    ;(stores[this.name_] || new Map()).delete(key)
    return new MockIDBRequest(undefined)
  }

  clear() {
    ;(stores[this.name_] || new Map()).clear()
    return new MockIDBRequest(undefined)
  }
}

class MockIDBDatabase {
  private storeNames_: string[] = []

  get objectStoreNames() {
    return new MockDOMStringList(this.storeNames_)
  }

  createObjectStore(name: string, _options?: any) {
    if (!this.storeNames_.includes(name)) {
      this.storeNames_.push(name)
    }
    if (!stores[name]) stores[name] = new Map()
    if (!indices[name]) indices[name] = {}
    return new MockIDBObjectStore(name)
  }

  transaction(
    names: string | string[],
    mode: 'readonly' | 'readwrite' = 'readonly'
  ) {
    return new MockIDBTransaction(Array.isArray(names) ? names : [names], mode)
  }
}

class MockIDBTransaction {
  private stores_: string[]
  oncomplete: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null

  constructor(stores: string[], _mode: string) {
    this.stores_ = stores
    // Simular conclusão assíncrona da transação
    setTimeout(() => {
      if (this.oncomplete) {
        this.oncomplete({ target: this })
      }
    }, 0)
  }

  objectStore(name: string) {
    if (!this.stores_.includes(name)) throw new Error(`Store ${name} not in transaction`)
    return new MockIDBObjectStore(name)
  }
}

class MockIDBOpenRequest extends MockIDBRequest {
  onupgradeneeded: ((event: any) => void) | null = null

  constructor() {
    super(new MockIDBDatabase())
    // Executar upgrade se houver handler
    setTimeout(() => {
      if (this.onupgradeneeded) {
        this.onupgradeneeded({ target: this })
      }
      if (this.onsuccess) {
        this.onsuccess({ target: this })
      }
    }, 0)
  }
}

const mockIndexedDB = {
  open: () => new MockIDBOpenRequest(),
}

// Aplicar mock globalmente para testes
beforeAll(() => {
  if (typeof window !== 'undefined' && !window.indexedDB) {
    ;(window as any).indexedDB = mockIndexedDB
  }
})
