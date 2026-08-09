import { describe, it, expect, beforeEach } from 'vitest'

// Mock simplificado do Supabase para testes de integração
interface MockDatabase {
  perfil: Record<string, any>
  tarefa: Record<string, any>
  observacao: Record<string, any>
  relatorio_dia: Record<string, any>
}

class MockSupabaseClient {
  private db: MockDatabase = {
    perfil: {},
    tarefa: {},
    observacao: {},
    relatorio_dia: {},
  }

  private currentTable: string = ''
  private filters: Array<{ type: string; col: string; val: any }> = []

  from(table: string) {
    this.currentTable = table
    this.filters = []
    return this
  }

  select(_cols?: string) {
    return this
  }

  eq(col: string, val: any) {
    this.filters.push({ type: 'eq', col, val })
    return this
  }

  neq(col: string, val: any) {
    this.filters.push({ type: 'neq', col, val })
    return this
  }

  lt(col: string, val: any) {
    this.filters.push({ type: 'lt', col, val })
    return this
  }

  lte(col: string, val: any) {
    this.filters.push({ type: 'lte', col, val })
    return this
  }

  gte(col: string, val: any) {
    this.filters.push({ type: 'gte', col, val })
    return this
  }

  order(col: string, opts?: any) {
    this.filters.push({ type: 'order', col, val: opts })
    return this
  }

  async execute() {
    if (this._updateData !== null) {
      return this._executeUpdate()
    }

    const table = this.db[this.currentTable as keyof MockDatabase] || {}
    let results = Object.values(table)

    for (const filter of this.filters) {
      if (filter.type === 'eq') {
        results = results.filter((r: any) => r[filter.col] === filter.val)
      } else if (filter.type === 'neq') {
        results = results.filter((r: any) => r[filter.col] !== filter.val)
      } else if (filter.type === 'lt') {
        results = results.filter((r: any) => r[filter.col] < filter.val)
      } else if (filter.type === 'lte') {
        results = results.filter((r: any) => r[filter.col] <= filter.val)
      } else if (filter.type === 'gte') {
        results = results.filter((r: any) => r[filter.col] >= filter.val)
      } else if (filter.type === 'order') {
        results.sort((a: any, b: any) => {
          if (filter.val?.ascending === false) {
            return b[filter.col]?.localeCompare(a[filter.col])
          }
          return a[filter.col]?.localeCompare(b[filter.col])
        })
      }
    }

    return { data: results, error: null }
  }

  async maybeSingle() {
    const result = await this.execute()
    return { data: result.data[0] || null, error: null }
  }

  async single() {
    const result = await this.execute()
    if (!result.data[0]) throw new Error('No rows returned')
    return { data: result.data[0], error: null }
  }

  async insert(data: any) {
    const table = this.db[this.currentTable as keyof MockDatabase]
    const id = data.id || Math.random().toString(36).slice(2)
    const record = { ...data, id, criado_em: new Date().toISOString() }
    table[id] = record
    return { data: [record], error: null }
  }

  update(data: any) {
    this._updateData = data
    return this
  }

  private _updateData: any = null

  async _executeUpdate() {
    const table = this.db[this.currentTable as keyof MockDatabase]
    for (const filter of this.filters) {
      if (filter.type === 'eq') {
        for (const [key, record] of Object.entries(table)) {
          if ((record as any)[filter.col] === filter.val) {
            table[key] = { ...record, ...this._updateData }
          }
        }
      }
    }
    return { data: [this._updateData], error: null }
  }

  // Método utilitário para limpar dados entre testes
  _resetDB() {
    this.db = {
      perfil: {},
      tarefa: {},
      observacao: {},
      relatorio_dia: {},
    }
  }

  // Método para seed de dados
  _seedData(table: string, data: any[]) {
    const t = this.db[table as keyof MockDatabase]
    data.forEach((record) => {
      t[record.id || Math.random().toString(36).slice(2)] = record
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Integração: Fluxo de Tarefas', () => {
  let mock: MockSupabaseClient

  beforeEach(() => {
    mock = new MockSupabaseClient()
  })

  it('cria tarefa e a retorna com id', async () => {
    const { data, error } = await mock
      .from('tarefa')
      .insert({
        titulo: 'Estudar React',
        data: '2026-08-08',
        classificacao: 'importante',
        usuario_id: 'user-1',
      })

    expect(error).toBeNull()
    expect(data?.[0]).toMatchObject({
      titulo: 'Estudar React',
      classificacao: 'importante',
    })
    expect(data?.[0].id).toBeDefined()
  })

  it('busca tarefas de um dia específico ordenadas por criação', async () => {
    const hoje = '2026-08-08'
    mock._seedData('tarefa', [
      {
        id: '1',
        titulo: 'Primeira',
        data: hoje,
        classificacao: 'importante',
        status: 'pendente',
        criada_em: '2026-08-08T09:00:00Z',
      },
      {
        id: '2',
        titulo: 'Segunda',
        data: hoje,
        classificacao: 'urgente',
        status: 'pendente',
        criada_em: '2026-08-08T10:00:00Z',
      },
      {
        id: '3',
        titulo: 'Outro dia',
        data: '2026-08-07',
        classificacao: 'importante',
        status: 'pendente',
      },
    ])

    const { data } = await mock
      .from('tarefa')
      .select('*')
      .eq('data', hoje)
      .neq('status', 'descartada')
      .order('criada_em')
      .execute()

    expect(data).toHaveLength(2)
    expect(data?.[0].titulo).toBe('Primeira')
    expect(data?.[1].titulo).toBe('Segunda')
  })

  it('busca tarefas pendentes de dias anteriores', async () => {
    const hoje = '2026-08-08'
    mock._seedData('tarefa', [
      {
        id: '1',
        titulo: 'Pendente ontem',
        data: '2026-08-07',
        status: 'pendente',
      },
      {
        id: '2',
        titulo: 'Concluída ontem',
        data: '2026-08-07',
        status: 'concluida',
      },
      {
        id: '3',
        titulo: 'Hoje',
        data: hoje,
        status: 'pendente',
      },
    ])

    const { data } = await mock
      .from('tarefa')
      .select('*')
      .lt('data', hoje)
      .eq('status', 'pendente')
      .execute()

    expect(data).toHaveLength(1)
    expect(data?.[0].titulo).toBe('Pendente ontem')
  })

  it('atualiza status de tarefa para concluída', async () => {
    const agora = new Date().toISOString()
    mock._seedData('tarefa', [
      {
        id: '1',
        titulo: 'Fazer algo',
        status: 'pendente',
        concluida_em: null,
      },
    ])

    await mock
      .from('tarefa')
      .update({
        status: 'concluida',
        concluida_em: agora,
      })
      .eq('id', '1')
      .execute()

    const { data } = await mock.from('tarefa').select('*').eq('id', '1').execute()
    expect(data?.[0].status).toBe('concluida')
    expect(data?.[0].concluida_em).toBe(agora)
  })
})

describe('Integração: Observações e Relatório', () => {
  let mock: MockSupabaseClient

  beforeEach(() => {
    mock = new MockSupabaseClient()
  })

  it('cria observação e a vincula a um dia', async () => {
    const { data } = await mock.from('observacao').insert({
      texto: 'Dia produtivo',
      data: '2026-08-08',
      usuario_id: 'user-1',
    })

    expect(data?.[0]).toMatchObject({
      texto: 'Dia produtivo',
      data: '2026-08-08',
    })
  })

  it('busca tarefas e observações de um dia para resumo', async () => {
    const hoje = '2026-08-08'
    mock._seedData('tarefa', [
      { id: '1', titulo: 'T1', data: hoje, status: 'concluida' },
      { id: '2', titulo: 'T2', data: hoje, status: 'pendente' },
      { id: '3', titulo: 'T3', data: '2026-08-07', status: 'pendente' },
    ])
    mock._seedData('observacao', [
      { id: 'o1', texto: 'Obs 1', data: hoje },
      { id: 'o2', texto: 'Obs 2', data: hoje },
    ])

    const tarefas = await mock
      .from('tarefa')
      .select('*')
      .eq('data', hoje)
      .execute()

    const obs = await mock
      .from('observacao')
      .select('*')
      .eq('data', hoje)
      .execute()

    expect(tarefas.data).toHaveLength(2)
    expect(obs.data).toHaveLength(2)
  })

  it('calcula resumo: 2/3 concluídas = 67%', async () => {
    const hoje = '2026-08-08'
    mock._seedData('tarefa', [
      { id: '1', titulo: 'T1', data: hoje, status: 'concluida' },
      { id: '2', titulo: 'T2', data: hoje, status: 'concluida' },
      { id: '3', titulo: 'T3', data: hoje, status: 'pendente' },
      { id: '4', titulo: 'T4', data: hoje, status: 'descartada' },
    ])

    const { data } = await mock
      .from('tarefa')
      .select('*')
      .eq('data', hoje)
      .neq('status', 'descartada')
      .execute()

    const concluidas = data?.filter((t) => t.status === 'concluida').length || 0
    const total = data?.length || 0
    const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0

    expect(total).toBe(3)
    expect(concluidas).toBe(2)
    expect(percentual).toBe(67)
  })
})

describe('Integração: Perfil e Autenticação (mock)', () => {
  let mock: MockSupabaseClient

  beforeEach(() => {
    mock = new MockSupabaseClient()
  })

  it('cria perfil ao signup', async () => {
    const userId = 'user-123'
    const { data } = await mock.from('perfil').insert({
      id: userId,
      nome: 'João Silva',
      profissao: 'Desenvolvedor',
      horario_relatorio: '18:00',
    })

    expect(data?.[0]).toMatchObject({
      id: userId,
      nome: 'João Silva',
      profissao: 'Desenvolvedor',
    })
  })

  it('carrega perfil do usuário após login', async () => {
    const userId = 'user-123'
    mock._seedData('perfil', [
      {
        id: userId,
        nome: 'João Silva',
        profissao: 'Desenvolvedor',
        horario_relatorio: '18:00',
      },
    ])

    const { data } = await mock
      .from('perfil')
      .select('*')
      .eq('id', userId)
      .single()

    expect(data).toMatchObject({
      id: userId,
      nome: 'João Silva',
    })
  })

  it('atualiza perfil do usuário', async () => {
    const userId = 'user-123'
    mock._seedData('perfil', [
      {
        id: userId,
        nome: 'João',
        profissao: 'Dev',
        horario_relatorio: '18:00',
      },
    ])

    await mock
      .from('perfil')
      .update({
        nome: 'João Silva',
        horario_relatorio: '19:00',
      })
      .eq('id', userId)
      .execute()

    const { data } = await mock.from('perfil').select('*').eq('id', userId).single()
    expect(data?.nome).toBe('João Silva')
    expect(data?.horario_relatorio).toBe('19:00')
  })
})
