import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseCall } from '../lib/supabase'
import { logErro } from '../lib/log'
import { pendentesAnteriores } from '../lib/dominio'
import type { Tarefa } from '../lib/dominio'
import type { ErroFoxDay } from '../lib/erros'

export function useAtrasadas(hoje: string) {
  const [atrasadas, setAtrasadas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<ErroFoxDay | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    const { data, erro: err } = await supabaseCall(async () => {
      return supabase
        .from('tarefa')
        .select('*')
        .lt('data', hoje)
        .eq('status', 'pendente')
        .order('data')
    })

    const tarефas = (data as Tarefa[]) ?? []
    setAtrasadas(pendentesAnteriores(tarефas, hoje))

    if (err) {
      setErro(err)
      logErro('Erro ao carregar tarefas atrasadas', err)
    }

    setCarregando(false)
  }, [hoje])

  useEffect(() => {
    carregar()
  }, [carregar])

  const reagendarParaHoje = async (id: string) => {
    const atrasadaAnterior = atrasadas.find(t => t.id === id)
    setAtrasadas(prev => prev.filter(t => t.id !== id))

    const { erro: err } = await supabaseCall(async () => {
      return supabase.from('tarefa').update({ data: hoje }).eq('id', id)
    })

    if (err) {
      if (atrasadaAnterior) {
        setAtrasadas(prev => [...prev, atrasadaAnterior])
      }
      setErro(err)
      logErro('Erro ao reagendar tarefa', err)
    }
  }

  const descartar = async (id: string) => {
    setAtrasadas(prev => prev.filter(t => t.id !== id))

    const { erro: err } = await supabaseCall(async () => {
      return supabase.from('tarefa').update({ status: 'descartada' }).eq('id', id)
    })

    if (err) {
      await carregar()
      setErro(err)
      logErro('Erro ao descartar tarefa atrasada', err)
    }
  }

  return { atrasadas, carregando, erro, carregar, reagendarParaHoje, descartar }
}
