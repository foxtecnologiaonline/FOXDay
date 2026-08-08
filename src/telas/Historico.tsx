import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { adicionarDias, formatarDataCurta, hojeISO } from '../lib/datas'
import { calcularResumo, type Tarefa } from '../lib/dominio'

interface RelatorioSalvo {
  data: string
  nota: number | null
}

export default function Historico() {
  const hoje = hojeISO()
  const inicio = adicionarDias(hoje, -29)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [notas, setNotas] = useState<Map<string, number | null>>(new Map())
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [t, r] = await Promise.all([
        supabase.from('tarefa').select('*').gte('data', inicio).lte('data', hoje),
        supabase
          .from('relatorio_dia')
          .select('data, nota')
          .gte('data', inicio)
          .lte('data', hoje),
      ])
      setTarefas((t.data as Tarefa[]) ?? [])
      setNotas(new Map(((r.data as RelatorioSalvo[]) ?? []).map((x) => [x.data, x.nota])))
      setCarregando(false)
    })()
  }, [inicio, hoje])

  const porDia = new Map<string, Tarefa[]>()
  for (const t of tarefas) {
    const lista = porDia.get(t.data) ?? []
    lista.push(t)
    porDia.set(t.data, lista)
  }
  const datas = [...new Set([...porDia.keys(), ...notas.keys()])].sort().reverse()

  const ultimos7 = tarefas.filter((t) => t.data >= adicionarDias(hoje, -6))
  const resumo7 = calcularResumo(ultimos7)

  return (
    <div className="tela">
      <header className="cabecalho">
        <h1>Histórico</h1>
        <p className="data-hoje">últimos 30 dias</p>
      </header>

      <section className="cartao destaque">
        <h2>Últimos 7 dias</h2>
        <p className="numero-grande">
          {resumo7.concluidas}
          <span className="numero-sufixo">/{resumo7.planejadas} concluídas</span>
        </p>
        <div className="barra">
          <div className="barra-preenchida" style={{ width: `${resumo7.percentual}%` }} />
        </div>
        <p className="texto-suave">
          Importantes: {resumo7.porClassificacao.importante.concluidas}/
          {resumo7.porClassificacao.importante.planejadas} concluídas
        </p>
      </section>

      {carregando ? (
        <p className="texto-suave">Carregando…</p>
      ) : datas.length === 0 ? (
        <div className="vazio">
          <p>Ainda não há histórico.</p>
          <p className="texto-suave">Ele aparece aqui conforme você usa o FOXDay.</p>
        </div>
      ) : (
        <ul className="lista-historico">
          {datas.map((d) => {
            const resumo = calcularResumo(porDia.get(d) ?? [])
            const nota = notas.get(d)
            if (resumo.planejadas === 0 && nota == null) return null
            return (
              <li key={d} className="cartao item-historico">
                <div className="historico-topo">
                  <span className="historico-data">{d === hoje ? 'hoje' : formatarDataCurta(d)}</span>
                  <span className="contagem">
                    {resumo.concluidas}/{resumo.planejadas}
                  </span>
                  {nota != null && <span className="historico-nota">{'★'.repeat(nota)}</span>}
                </div>
                <div className="barra fina">
                  <div className="barra-preenchida" style={{ width: `${resumo.percentual}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
