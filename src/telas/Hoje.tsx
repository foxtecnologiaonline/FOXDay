import { useCallback, useEffect, useRef, useState } from 'react'
import type { Perfil } from '../App'
import { supabase } from '../lib/supabase'
import SkeletonTarefa from '../componentes/SkeletonTarefa'
import ModalConfirmarVoz from '../componentes/ModalConfirmarVoz'
import { useTarefasHoje } from '../hooks/useTarefasHoje'
import { useAtrasadas } from '../hooks/useAtrasadas'
import { useVozCaptura } from '../hooks/useVozCaptura'
import { useInterpretarVoz } from '../hooks/useInterpretarVoz'
import {
  adicionarDias,
  formatarDataCurta,
  formatarDataLonga,
  hojeISO,
  passouDoHorario,
} from '../lib/datas'
import {
  CLASSIFICACOES,
  ROTULO_CLASSIFICACAO,
  ordenarTarefas,
  type Classificacao,
  type Observacao,
} from '../lib/dominio'

interface Props {
  perfil: Perfil | null
  irParaRelatorio: () => void
}

export default function Hoje({ perfil, irParaRelatorio }: Props) {
  const hoje = hojeISO()
  const { tarefas, carregando: carregandoTarefas, marcarConcluida, descartar } = useTarefasHoje()
  const { atrasadas, carregando: carregandoAtrasadas, reagendarParaHoje, descartar: descartarAtrasada } = useAtrasadas(hoje)
  const { estado: vozEstado, iniciar: iniciarVoz, limpar: limparVoz } = useVozCaptura()
  const { interpretar } = useInterpretarVoz()

  const [mantidas, setMantidas] = useState<Set<string>>(new Set())
  const [observacoes, setObservacoes] = useState<Observacao[]>([])
  const [diaFechado, setDiaFechado] = useState(true)

  const [texto, setTexto] = useState('')
  const [modo, setModo] = useState<'tarefa' | 'obs' | 'voz'>('tarefa')
  const [diaAlvo, setDiaAlvo] = useState<'hoje' | 'amanha'>('hoje')
  const [salvando, setSalvando] = useState(false)
  const ultimaClassificacao = useRef<Classificacao>('importante')

  const [mostrarModalVoz, setMostrarModalVoz] = useState(false)
  const [tarefa, setTarefa] = useState('')
  const [classificacaoInterpretada, setClassificacaoInterpretada] = useState<Classificacao>('importante')
  const [dataInterpretada, setDataInterpretada] = useState<'hoje' | 'amanha'>('hoje')
  const [confianca, setConfianca] = useState(0)
  const [interpretando, setInterpretando] = useState(false)

  const carregando = carregandoTarefas || carregandoAtrasadas

  const carregarObsEDiaFechado = useCallback(async () => {
    const [obs, rel] = await Promise.all([
      supabase.from('observacao').select('*').eq('data', hoje).order('criado_em'),
      supabase.from('relatorio_dia').select('id').eq('data', hoje).maybeSingle(),
    ])
    setObservacoes((obs.data as Observacao[]) ?? [])
    setDiaFechado(Boolean(rel.data))
  }, [hoje])

  useEffect(() => {
    carregarObsEDiaFechado()
  }, [carregarObsEDiaFechado])

  async function salvar(classificacao?: Classificacao) {
    const conteudo = texto.trim()
    if (!conteudo || salvando) return
    setSalvando(true)
    try {
      if (modo === 'obs') {
        await supabase.from('observacao').insert({ texto: conteudo, data: hoje })
        await carregarObsEDiaFechado()
      } else {
        const c = classificacao ?? ultimaClassificacao.current
        ultimaClassificacao.current = c
        await supabase.from('tarefa').insert({
          titulo: conteudo,
          data: diaAlvo === 'hoje' ? hoje : adicionarDias(hoje, 1),
          classificacao: c,
        })
      }
      setTexto('')
    } finally {
      setSalvando(false)
    }
  }

  const listaTriagem = atrasadas.filter((t) => !mantidas.has(t.id))
  const listaDia = ordenarTarefas(tarefas)
  const primeiroNome = perfil?.nome.split(' ')[0]
  const mostrarFechamento = Boolean(
    perfil && !diaFechado && tarefas.length > 0 && passouDoHorario(perfil.horario_relatorio)
  )

  return (
    <div className="tela">
      <header className="cabecalho">
        <h1>{primeiroNome ? `Olá, ${primeiroNome}` : 'Hoje'}</h1>
        <p className="data-hoje">{formatarDataLonga(hoje)}</p>
      </header>

      {mostrarFechamento && (
        <button className="banner-fechamento" onClick={irParaRelatorio}>
          🌆 Hora de fechar o dia — ver relatório e dar sua nota →
        </button>
      )}

      {listaTriagem.length > 0 && (
        <section className="cartao triagem">
          <h2>Pendências de dias anteriores</h2>
          <ul>
            {listaTriagem.map((t) => (
              <li key={t.id} className="item-triagem">
                <div className="triagem-info">
                  <span className={`selo ${t.classificacao}`}>
                    {ROTULO_CLASSIFICACAO[t.classificacao][0]}
                  </span>
                  <span className="triagem-titulo">{t.titulo}</span>
                  <span className="triagem-data">{formatarDataCurta(t.data)}</span>
                </div>
                <div className="triagem-acoes">
                  <button onClick={() => reagendarParaHoje(t.id)}>→ Hoje</button>
                  <button onClick={() => setMantidas(new Set([...mantidas, t.id]))}>Manter</button>
                  <button className="perigo" onClick={() => descartarAtrasada(t.id)}>
                    Descartar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="lista-dia">
        {carregando ? (
          <ul>
            <SkeletonTarefa />
            <SkeletonTarefa />
            <SkeletonTarefa />
          </ul>
        ) : listaDia.length === 0 ? (
          <div className="vazio">
            <p>Nenhuma tarefa para hoje.</p>
            <p className="texto-suave">
              Digite abaixo o que precisa ser feito e escolha a importância — só isso.
            </p>
          </div>
        ) : (
          <ul>
            {listaDia.map((t) => (
              <li
                key={t.id}
                className={`item-tarefa ${t.status === 'concluida' ? 'concluida' : ''}`}
              >
                <label className="alvo-toque">
                  <input
                    type="checkbox"
                    checked={t.status === 'concluida'}
                    onChange={() => marcarConcluida(t.id)}
                  />
                  <span className="titulo-tarefa">{t.titulo}</span>
                </label>
                <span className={`selo ${t.classificacao}`} title={ROTULO_CLASSIFICACAO[t.classificacao]}>
                  {ROTULO_CLASSIFICACAO[t.classificacao][0]}
                </span>
                {t.status === 'pendente' && (
                  <button
                    className="botao-descartar"
                    title="Descartar"
                    onClick={() => descartar(t.id)}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {observacoes.length > 0 && (
        <section className="cartao">
          <h2>Anotações de hoje</h2>
          <ul className="lista-obs">
            {observacoes.map((o) => (
              <li key={o.id}>{o.texto}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="captura">
        <div className="captura-modos">
          <button
            className={modo === 'tarefa' ? 'chip ativo' : 'chip'}
            onClick={() => setModo('tarefa')}
          >
            ✓ Tarefa
          </button>
          <button className={modo === 'obs' ? 'chip ativo' : 'chip'} onClick={() => setModo('obs')}>
            ✎ Anotação
          </button>
          <button
            className={modo === 'voz' ? 'chip ativo' : 'chip'}
            onClick={() => setModo('voz')}
          >
            🎤 Voz
          </button>
          {modo === 'tarefa' && (
            <span className="captura-dia">
              <button
                className={diaAlvo === 'hoje' ? 'chip ativo' : 'chip'}
                onClick={() => setDiaAlvo('hoje')}
              >
                Hoje
              </button>
              <button
                className={diaAlvo === 'amanha' ? 'chip ativo' : 'chip'}
                onClick={() => setDiaAlvo('amanha')}
              >
                Amanhã
              </button>
            </span>
          )}
        </div>
        {modo !== 'voz' && (
          <>
            <input
              className="captura-campo"
              placeholder={modo === 'tarefa' ? 'O que precisa ser feito?' : 'Anote uma observação…'}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') salvar()
              }}
            />
            <div className="captura-acoes">
              {modo === 'tarefa' ? (
                CLASSIFICACOES.map((c) => (
                  <button
                    key={c}
                    className={`botao-classificacao ${c}`}
                    disabled={!texto.trim() || salvando}
                    onClick={() => salvar(c)}
                  >
                    {ROTULO_CLASSIFICACAO[c]}
                  </button>
                ))
              ) : (
                <button
                  className="botao-primario"
                  disabled={!texto.trim() || salvando}
                  onClick={() => salvar()}
                >
                  Registrar
                </button>
              )}
            </div>
          </>
        )}
        {modo === 'voz' && (
          <div className="captura-voz">
            <div className="voz-status">
              {vozEstado.escutando && (
                <div className="voz-escutando">
                  <div className="voz-animacao">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p>Escutando…</p>
                </div>
              )}
              {vozEstado.processando && (
                <div className="voz-processando">
                  <p>Processando…</p>
                </div>
              )}
              {vozEstado.erro && (
                <div className="voz-erro">
                  <p>⚠️ {vozEstado.erro}</p>
                </div>
              )}
              {vozEstado.transcricao && !vozEstado.escutando && !vozEstado.processando && (
                <div className="voz-resultado">
                  <p>📝 {vozEstado.transcricao}</p>
                </div>
              )}
            </div>
            <div className="captura-acoes">
              {!vozEstado.escutando && !vozEstado.processando && !vozEstado.transcricao && (
                <button
                  className="botao-primario"
                  onClick={() => iniciarVoz()}
                  disabled={!navigator.mediaDevices}
                >
                  🎤 Começar a falar
                </button>
              )}
              {vozEstado.escutando && (
                <button
                  className="botao-secundario"
                  onClick={() => {
                    // Stop button would go here
                  }}
                >
                  Parar
                </button>
              )}
              {vozEstado.transcricao && !vozEstado.escutando && !vozEstado.processando && (
                <>
                  <button
                    className="botao-secundario"
                    onClick={() => limparVoz()}
                    disabled={interpretando}
                  >
                    Cancelar
                  </button>
                  <button
                    className="botao-primario"
                    onClick={async () => {
                      setInterpretando(true)
                      try {
                        const resultado = await interpretar(vozEstado.transcricao)
                        setTarefa(resultado.texto)
                        setClassificacaoInterpretada(resultado.classificacao)
                        setDataInterpretada(resultado.data)
                        setConfianca(resultado.confianca)
                        ultimaClassificacao.current = resultado.classificacao
                        setDiaAlvo(resultado.data)
                        setMostrarModalVoz(true)
                      } finally {
                        setInterpretando(false)
                      }
                    }}
                    disabled={interpretando}
                  >
                    {interpretando ? 'Interpretando…' : 'Confirmar'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {mostrarModalVoz && (
        <ModalConfirmarVoz
          tarefa={tarefa}
          classificacao={classificacaoInterpretada}
          data={dataInterpretada}
          confianca={confianca}
          processando={salvando}
          onConfirmar={async (t, c, d) => {
            setSalvando(true)
            try {
              await supabase.from('tarefa').insert({
                titulo: t,
                data: d === 'hoje' ? hoje : adicionarDias(hoje, 1),
                classificacao: c,
              })
              limparVoz()
              setMostrarModalVoz(false)
              setModo('tarefa')
            } finally {
              setSalvando(false)
            }
          }}
          onCancelar={() => {
            setMostrarModalVoz(false)
            limparVoz()
          }}
        />
      )}
    </div>
  )
}
