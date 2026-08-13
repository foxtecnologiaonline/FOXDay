import { describe, expect, it } from 'vitest'
import { adicionarDias, passouDoHorario } from './datas'
import {
  calcularResumo,
  ordenarTarefas,
  pendentesAnteriores,
  type Tarefa,
} from './dominio'

function tarefa(parcial: Partial<Tarefa>): Tarefa {
  return {
    id: Math.random().toString(36).slice(2),
    titulo: 'tarefa',
    data: '2026-08-08',
    classificacao: 'circunstancial',
    status: 'pendente',
    origem: 'texto',
    criada_em: '2026-08-08T08:00:00Z',
    concluida_em: null,
    ...parcial,
  }
}

describe('ordenarTarefas', () => {
  it('ordena pendentes por importante > urgente > circunstancial', () => {
    const lista = [
      tarefa({ titulo: 'c', classificacao: 'circunstancial' }),
      tarefa({ titulo: 'i', classificacao: 'importante' }),
      tarefa({ titulo: 'u', classificacao: 'urgente' }),
    ]
    expect(ordenarTarefas(lista).map((t) => t.titulo)).toEqual(['i', 'u', 'c'])
  })

  it('coloca concluídas ao final, mesmo sendo importantes', () => {
    const lista = [
      tarefa({ titulo: 'feita', classificacao: 'importante', status: 'concluida' }),
      tarefa({ titulo: 'pendente', classificacao: 'circunstancial' }),
    ]
    expect(ordenarTarefas(lista).map((t) => t.titulo)).toEqual(['pendente', 'feita'])
  })

  it('desempata pela ordem de criação', () => {
    const lista = [
      tarefa({ titulo: 'segunda', criada_em: '2026-08-08T10:00:00Z' }),
      tarefa({ titulo: 'primeira', criada_em: '2026-08-08T09:00:00Z' }),
    ]
    expect(ordenarTarefas(lista).map((t) => t.titulo)).toEqual(['primeira', 'segunda'])
  })
})

describe('pendentesAnteriores', () => {
  it('retorna só pendentes com data anterior a hoje', () => {
    const lista = [
      tarefa({ titulo: 'ontem-pendente', data: '2026-08-07' }),
      tarefa({ titulo: 'ontem-feita', data: '2026-08-07', status: 'concluida' }),
      tarefa({ titulo: 'hoje', data: '2026-08-08' }),
      tarefa({ titulo: 'anteontem', data: '2026-08-06' }),
    ]
    const nomes = pendentesAnteriores(lista, '2026-08-08').map((t) => t.titulo)
    expect(nomes).toContain('ontem-pendente')
    expect(nomes).toContain('anteontem')
    expect(nomes).not.toContain('ontem-feita')
    expect(nomes).not.toContain('hoje')
  })
})

describe('calcularResumo', () => {
  it('conta planejadas, concluídas e percentual, ignorando descartadas', () => {
    const resumo = calcularResumo([
      tarefa({ classificacao: 'importante', status: 'concluida' }),
      tarefa({ classificacao: 'importante', status: 'pendente' }),
      tarefa({ classificacao: 'urgente', status: 'concluida' }),
      tarefa({ classificacao: 'circunstancial', status: 'descartada' }),
    ])
    expect(resumo.planejadas).toBe(3)
    expect(resumo.concluidas).toBe(2)
    expect(resumo.percentual).toBe(67)
    expect(resumo.porClassificacao.importante).toEqual({ planejadas: 2, concluidas: 1 })
    expect(resumo.porClassificacao.urgente).toEqual({ planejadas: 1, concluidas: 1 })
    expect(resumo.porClassificacao.circunstancial).toEqual({ planejadas: 0, concluidas: 0 })
  })

  it('dia vazio tem percentual zero', () => {
    expect(calcularResumo([]).percentual).toBe(0)
  })
})

describe('datas', () => {
  it('adicionarDias atravessa fim de mês e ano', () => {
    expect(adicionarDias('2026-08-31', 1)).toBe('2026-09-01')
    expect(adicionarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(adicionarDias('2026-08-01', -1)).toBe('2026-07-31')
  })

  it('passouDoHorario compara hora e minuto locais', () => {
    const as18h = new Date(2026, 7, 8, 18, 0)
    const as1759 = new Date(2026, 7, 8, 17, 59)
    expect(passouDoHorario('18:00:00', as18h)).toBe(true)
    expect(passouDoHorario('18:00:00', as1759)).toBe(false)
    expect(passouDoHorario('18:00', as18h)).toBe(true)
  })
})
