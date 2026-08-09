import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SkeletonCard from '../componentes/SkeletonCard'
import { adicionarDias, formatarDataLonga, hojeISO } from '../lib/datas'
import {
  CLASSIFICACOES,
  ROTULO_CLASSIFICACAO,
  calcularResumo,
  type Observacao,
  type Tarefa,
} from '../lib/dominio'

interface Fechamento {
  nota: number | null
  observacao: string | null
}

export default function Relatorio() {
  const hoje = hojeISO()
  const [data, setData] = useState(hoje)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [observacoes, setObservacoes] = useState<Observacao[]>([])
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [nota, setNota] = useState(0)
  const [obsFinal, setObsFinal] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [t, o, r] = await Promise.all([
      supabase.from('tarefa').select('*').eq('data', data),
      supabase.from('observacao').select('*').eq('data', data).order('criado_em'),
      supabase.from('relatorio_dia').select('nota, observacao').eq('data', data).maybeSingle(),
    ])
    setTarefas((t.data as Tarefa[]) ?? [])
    setObservacoes((o.data as Observacao[]) ?? [])
    const fech = (r.data as Fechamento | null) ?? null
    setFechamento(fech)
    setNota(fech?.nota ?? 0)
    setObsFinal(fech?.observacao ?? '')
    setMensagem('')
    setCarregando(false)
  }, [data])

  useEffect(() => {
    carregar()
  }, [carregar])

  const resumo = calcularResumo(tarefas)

  async function fecharDia() {
    setSalvando(true)
    try {
      const { error } = await supabase.from('relatorio_dia').upsert(
        {
          data,
          planejadas: resumo.planejadas,
          concluidas: resumo.concluidas,
          por_classificacao: resumo.porClassificacao,
          nota: nota || null,
          observacao: obsFinal.trim() || null,
        },
        { onConflict: 'usuario_id,data' }
      )
      if (error) throw error
      setFechamento({ nota: nota || null, observacao: obsFinal.trim() || null })
      setMensagem('Dia fechado. Bom descanso! 🌙')
    } catch {
      setMensagem('Não foi possível salvar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="tela">
      <header className="cabecalho navegacao-data">
        <button className="botao-seta" onClick={() => setData(adicionarDias(data, -1))}>
          ‹
        </button>
        <div>
          <h1>Relatório</h1>
          <p className="data-hoje">{data === hoje ? `hoje, ${formatarDataLonga(data)}` : formatarDataLonga(data)}</p>
        </div>
        <button
          className="botao-seta"
          disabled={data === hoje}
          onClick={() => setData(adicionarDias(data, 1))}
        >
          ›
        </button>
      </header>

      {carregando ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        <>
          <section className="cartao destaque">
            <p className="numero-grande">
              {resumo.concluidas}
              <span className="numero-sufixo">/{resumo.planejadas} concluídas</span>
            </p>
            <div className="barra">
              <div className="barra-preenchida" style={{ width: `${resumo.percentual}%` }} />
            </div>
            <p className="texto-suave">{resumo.percentual}% do dia planejado</p>
          </section>

          <section className="cartao">
            <h2>Por importância</h2>
            {CLASSIFICACOES.map((c) => {
              const r = resumo.porClassificacao[c]
              const pct = r.planejadas === 0 ? 0 : Math.round((r.concluidas / r.planejadas) * 100)
              return (
                <div key={c} className="linha-classificacao">
                  <span className={`selo ${c}`}>{ROTULO_CLASSIFICACAO[c][0]}</span>
                  <span className="rotulo-classificacao">{ROTULO_CLASSIFICACAO[c]}</span>
                  <div className={`barra fina ${c}`}>
                    <div className="barra-preenchida" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="contagem">
                    {r.concluidas}/{r.planejadas}
                  </span>
                </div>
              )
            })}
          </section>
        </>
      )}

      {observacoes.length > 0 && (
        <section className="cartao">
          <h2>Anotações do dia</h2>
          <ul className="lista-obs">
            {observacoes.map((o) => (
              <li key={o.id}>{o.texto}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="cartao">
        <h2>{fechamento ? 'Fechamento do dia ✓' : 'Fechar o dia'}</h2>
        <p className="texto-suave">Como foi o seu dia?</p>
        <div className="notas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={n <= nota ? 'estrela ativa' : 'estrela'}
              onClick={() => setNota(n)}
              aria-label={`Nota ${n}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          className="campo-texto"
          placeholder="Observação livre (opcional)"
          value={obsFinal}
          onChange={(e) => setObsFinal(e.target.value)}
          rows={2}
        />
        {mensagem && <p className="mensagem-ok">{mensagem}</p>}
        <button className="botao-primario" disabled={salvando} onClick={fecharDia}>
          {salvando ? 'Salvando…' : fechamento ? 'Atualizar fechamento' : 'Fechar o dia'}
        </button>
      </section>
    </div>
  )
}
