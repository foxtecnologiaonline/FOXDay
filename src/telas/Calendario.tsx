import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { calcularResumo, type Tarefa, type Observacao } from '../lib/dominio'
import { formatarDataLonga } from '../lib/datas'
import SkeletonTarefa from '../componentes/SkeletonTarefa'

interface DiaInfo {
  data: string
  tarefas: Tarefa[]
  observacoes: Observacao[]
  nota: string | null
}

export default function Calendario() {
  const [mes, setMes] = useState(new Date().getMonth())
  const [ano, setAno] = useState(new Date().getFullYear())
  const [diasComDados, setDiasComDados] = useState<Set<string>>(new Set())
  const [diaAtual, setDiaAtual] = useState<string | null>(null)
  const [infoDia, setInfoDia] = useState<DiaInfo | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Carrega todos os dados do mês para marcar dias com atividade
  useEffect(() => {
    const carregarDadosMes = async () => {
      const primeiroDia = new Date(ano, mes, 1)
      const ultimoDia = new Date(ano, mes + 1, 0)

      const [tarefasResult, obsResult] = await Promise.all([
        supabase
          .from('tarefa')
          .select('data, status')
          .gte('data', primeiroDia.toISOString().split('T')[0])
          .lte('data', ultimoDia.toISOString().split('T')[0]),
        supabase
          .from('observacao')
          .select('data')
          .gte('data', primeiroDia.toISOString().split('T')[0])
          .lte('data', ultimoDia.toISOString().split('T')[0]),
      ])

      const diasUnicos = new Set<string>()
      ;(tarefasResult.data || []).forEach((t: any) => diasUnicos.add(t.data))
      ;(obsResult.data || []).forEach((o: any) => diasUnicos.add(o.data))

      setDiasComDados(diasUnicos)
    }

    carregarDadosMes()
  }, [mes, ano])

  const carregarDia = async (data: string) => {
    setCarregando(true)
    setDiaAtual(data)

    const [tarefasResult, obsResult, notaResult] = await Promise.all([
      supabase
        .from('tarefa')
        .select('*')
        .eq('data', data)
        .neq('status', 'descartada'),
      supabase
        .from('observacao')
        .select('*')
        .eq('data', data)
        .order('criado_em'),
      supabase
        .from('relatorio_dia')
        .select('nota')
        .eq('data', data)
        .maybeSingle(),
    ])

    setInfoDia({
      data,
      tarefas: (tarefasResult.data as Tarefa[]) || [],
      observacoes: (obsResult.data as Observacao[]) || [],
      nota: (notaResult.data as any)?.nota || null,
    })

    setCarregando(false)
  }

  const irProximoMes = () => {
    if (mes === 11) {
      setAno(ano + 1)
      setMes(0)
    } else {
      setMes(mes + 1)
    }
    setDiaAtual(null)
    setInfoDia(null)
  }

  const irMesAnterior = () => {
    if (mes === 0) {
      setAno(ano - 1)
      setMes(11)
    } else {
      setMes(mes - 1)
    }
    setDiaAtual(null)
    setInfoDia(null)
  }

  const meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)
  const diaSemanaInicio = primeiroDia.getDay() === 0 ? 6 : primeiroDia.getDay() - 1

  const dias = []
  for (let i = 0; i < diaSemanaInicio; i++) {
    dias.push(null)
  }
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    dias.push(dia)
  }

  const resumoDia = infoDia ? calcularResumo(infoDia.tarefas) : null

  return (
    <div className="tela">
      <header className="cabecalho">
        <h1>Calendário</h1>
        <p className="data-hoje">Visualize seus dias</p>
      </header>

      <div className="calendario-container">
        {/* Calendário Grid */}
        <section className="cartao calendario-secao">
          <div className="calendario-header">
            <button onClick={irMesAnterior} className="botao-navegacao">
              ←
            </button>
            <h2>
              {meses[mes]} {ano}
            </h2>
            <button onClick={irProximoMes} className="botao-navegacao">
              →
            </button>
          </div>

          <div className="calendario-grid">
            <div className="calendario-semana-header">
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sab</div>
              <div>Dom</div>
            </div>

            <div className="calendario-dias">
              {dias.map((dia, idx) => {
                const dataStr =
                  dia !== null
                    ? `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                    : null
                const temDados = dataStr && diasComDados.has(dataStr)
                const selecionado = dataStr === diaAtual

                return (
                  <button
                    key={idx}
                    className={`dia-box ${temDados ? 'com-dados' : ''} ${selecionado ? 'selecionado' : ''}`}
                    onClick={() => dataStr && carregarDia(dataStr)}
                    disabled={!dataStr}
                  >
                    {dia}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Detalhes do Dia */}
        {diaAtual && (
          <section className="cartao resumo-dia">
            <h2>{formatarDataLonga(diaAtual)}</h2>

            {carregando ? (
              <div>
                <SkeletonTarefa />
                <SkeletonTarefa />
              </div>
            ) : infoDia ? (
              <>
                {/* Resumo Stats */}
                {resumoDia && (
                  <div className="resumo-stats">
                    <div className="stat">
                      <span className="label">Planejadas</span>
                      <span className="valor">{resumoDia.planejadas}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Completas</span>
                      <span className="valor">{resumoDia.concluidas}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Taxa</span>
                      <span className="valor">{resumoDia.percentual}%</span>
                    </div>
                  </div>
                )}

                {/* Tarefas */}
                {infoDia.tarefas.length > 0 && (
                  <div className="tarefas-dia">
                    <h3>Tarefas ({infoDia.tarefas.length})</h3>
                    <ul>
                      {infoDia.tarefas.map((t) => (
                        <li key={t.id} className={`item-tarefa-resumo ${t.status}`}>
                          <input type="checkbox" checked={t.status === 'concluida'} disabled />
                          <span>{t.titulo}</span>
                          <span className={`selo ${t.classificacao}`}>
                            {t.classificacao[0].toUpperCase()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Observações */}
                {infoDia.observacoes.length > 0 && (
                  <div className="obs-dia">
                    <h3>Observações ({infoDia.observacoes.length})</h3>
                    <ul>
                      {infoDia.observacoes.map((o) => (
                        <li key={o.id} className="item-obs">
                          <p>{o.texto}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Nota do Dia */}
                {infoDia.nota && (
                  <div className="nota-dia">
                    <h3>Nota do Dia</h3>
                    <p className="nota-texto">{infoDia.nota}</p>
                  </div>
                )}

                {infoDia.tarefas.length === 0 && infoDia.observacoes.length === 0 && !infoDia.nota && (
                  <p className="vazio">Nenhuma atividade registrada neste dia.</p>
                )}
              </>
            ) : null}
          </section>
        )}
      </div>
    </div>
  )
}
