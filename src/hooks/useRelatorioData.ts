import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseCall } from '../lib/supabase'
import { logErro } from '../lib/log'
import type { Observacao, Tarefa } from '../lib/dominio'
import { TipoErro, type ErroFoxDay } from '../lib/erros'

interface Fechamento {
  nota: number | null
  observacao: string | null
}

export function useRelatorioData(data: string) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [observacoes, setObservacoes] = useState<Observacao[]>([])
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<ErroFoxDay | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    const [t, o, r] = await Promise.all([
      supabase.from('tarefa').select('*').eq('data', data),
      supabase.from('observacao').select('*').eq('data', data).order('criado_em'),
      supabase.from('relatorio_dia').select('nota, observacao').eq('data', data).maybeSingle(),
    ])

    setTarefas((t.data as Tarefa[]) ?? [])
    setObservacoes((o.data as Observacao[]) ?? [])

    const fechData = (r.data as Fechamento | null) ?? null
    setFechamento(fechData)

    if (t.error) {
      setErro({ tipo: TipoErro.BANCO_DADOS, mensagem: t.error.message })
      logErro('Erro ao carregar tarefas do relatório', t.error)
    }
    if (o.error) {
      setErro({ tipo: TipoErro.BANCO_DADOS, mensagem: o.error.message })
      logErro('Erro ao carregar observações', o.error)
    }

    setCarregando(false)
  }, [data])

  useEffect(() => {
    carregar()
  }, [carregar])

  const salvarFechamento = async (nota: number | null, obsFinal: string) => {
    const { erro: err } = await supabaseCall(async () => {
      return supabase.from('relatorio_dia').upsert(
        {
          data,
          nota: nota || null,
          observacao: obsFinal.trim() || null,
        },
        { onConflict: 'usuario_id,data' }
      )
    })

    if (err) {
      setErro(err)
      logErro('Erro ao salvar fechamento', err)
      return false
    }

    setFechamento({ nota: nota || null, observacao: obsFinal.trim() || null })
    return true
  }

  return { tarefas, observacoes, fechamento, carregando, erro, carregar, salvarFechamento }
}
