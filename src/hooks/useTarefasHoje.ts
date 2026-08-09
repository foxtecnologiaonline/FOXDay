import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseCall } from '../lib/supabase'
import { logErro } from '../lib/log'
import { hojeISO } from '../lib/datas'
import type { ErroFoxDay, Tarefa } from '../lib/dominio'

export function useTarefasHoje() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<ErroFoxDay | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    const { data, erro: err } = await supabaseCall(async () => {
      return supabase
        .from('tarefa')
        .select('*')
        .eq('data', hojeISO())
        .neq('status', 'descartada')
        .order('criada_em')
    })

    setTarefas((data as Tarefa[]) ?? [])
    if (err) {
      setErro(err)
      logErro('Erro ao carregar tarefas de hoje', err)
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const marcarConcluida = async (id: string) => {
    const tarefaAnterior = tarefas.find(t => t.id === id)
    const novoStatus = tarefaAnterior?.status === 'concluida' ? 'pendente' : 'concluida'

    setTarefas(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              status: novoStatus,
              concluida_em: novoStatus === 'concluida' ? new Date().toISOString() : null,
            }
          : t
      )
    )

    const { erro: err } = await supabaseCall(async () => {
      return supabase
        .from('tarefa')
        .update({
          status: novoStatus,
          concluida_em: novoStatus === 'concluida' ? new Date().toISOString() : null,
        })
        .eq('id', id)
    })

    if (err) {
      setTarefas(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                status: tarefaAnterior!.status,
                concluida_em: tarefaAnterior!.concluida_em,
              }
            : t
        )
      )
      setErro(err)
      logErro('Erro ao marcar tarefa', err)
    }
  }

  const descartar = async (id: string) => {
    setTarefas(prev => prev.filter(t => t.id !== id))

    const { erro: err } = await supabaseCall(async () => {
      return supabase.from('tarefa').update({ status: 'descartada' }).eq('id', id)
    })

    if (err) {
      await carregar()
      setErro(err)
      logErro('Erro ao descartar tarefa', err)
    }
  }

  return { tarefas, carregando, erro, carregar, marcarConcluida, descartar }
}
