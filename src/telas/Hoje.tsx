import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Perfil } from '../App'
import { supabase } from '../lib/supabase'
import SkeletonTarefa from '../componentes/SkeletonTarefa'
import ModalConfirmarVoz from '../componentes/ModalConfirmarVoz'
import ModalOpcoesTarefa from '../componentes/ModalOpcoesTarefa'
import MenuStatusDelegacao from '../componentes/MenuStatusDelegacao'
import FiltrosHoje from '../componentes/FiltrosHoje'
import type { StatusDelegacao } from '../lib/dominio'
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
import { ACCEPT_INPUT_ARQUIVO, FORMATOS_ACEITOS } from '../lib/audio'
import { ErroTranscricao, transcreverAudio, validarArquivoAudio } from '../lib/transcricao'

interface Props {
  perfil: Perfil | null
  irParaRelatorio: () => void
}

function gerarInstanciasRotina(
  rotinaMaeId: string,
  titulo: string,
  classificacao: Classificacao,
  diasRotina: number[]
): any[] {
  const instancias = []
  const hoje = new Date()

  // Gerar instâncias para os próximos 14 dias
  for (let i = 0; i < 14; i++) {
    const data = new Date(hoje)
    data.setDate(data.getDate() + i)
    const diaSemana = data.getDay() === 0 ? 6 : data.getDay() - 1 // Converter domingo

    if (diasRotina.includes(diaSemana)) {
      const dataFormatada = data.toISOString().split('T')[0]
      instancias.push({
        titulo,
        data: dataFormatada,
        classificacao,
        eh_rotina: true,
        dias_rotina: diasRotina,
        rotina_id: rotinaMaeId,
      })
    }
  }
  return instancias
}

function diasRotinaPorExtenso(dias: number[]): string {
  const nomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
  return dias.map(d => nomes[d]).join('-')
}

function renderarIndicadores(t: any) {
  return (
    <>
      {t.delegada_para && (
        <span className="indicador-delegacao" title={`Delegada para ${t.delegada_para}`}>
          👤 {t.delegada_para}
          {t.prazo_delegacao && <span className="prazo"> ({formatarDataCurta(t.prazo_delegacao)})</span>}
        </span>
      )}
      {t.eh_rotina && t.dias_rotina && (
        <span className="indicador-rotina" title="Tarefa rotineira">
          🔄 {diasRotinaPorExtenso(t.dias_rotina)}
        </span>
      )}
    </>
  )
}

async function mudarStatusDelegacao(tarefaId: string, novoStatus: StatusDelegacao) {
  const { error } = await supabase
    .from('tarefa')
    .update({ status_delegacao: novoStatus })
    .eq('id', tarefaId)

  if (error) {
    console.error('Erro ao atualizar status de delegação:', error)
    throw error
  }
}

export default function Hoje({ perfil, irParaRelatorio }: Props) {
  const hoje = hojeISO()
  const { tarefas, carregando: carregandoTarefas, marcarConcluida, descartar, carregar } = useTarefasHoje()
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

  const [transcrevendoArquivo, setTranscrevendoArquivo] = useState(false)
  const [erroArquivo, setErroArquivo] = useState('')
  const arquivoInputRef = useRef<HTMLInputElement>(null)

  const [mostrarOpcoes, setMostrarOpcoes] = useState(false)
  const [opcoesTarefa, setOpcoesTarefa] = useState({
    ehRotina: false,
    diasRotina: [] as number[],
    ehDelegada: false,
    delegadaPara: null as string | null,
    prazoDelegacao: null as string | null,
  })
  const [filtros, setFiltros] = useState({ delegadas: false, rotinas: false })

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
        const dataInserção = diaAlvo === 'hoje' ? hoje : adicionarDias(hoje, 1)

        if (opcoesTarefa.ehRotina && opcoesTarefa.diasRotina.length > 0) {
          // Criar tarefa "mãe" de rotina (sem data específica, usamos hoje como ref)
          const { data: rotinaMae } = await supabase
            .from('tarefa')
            .insert({
              titulo: conteudo,
              data: dataInserção,
              classificacao: c,
              eh_rotina: true,
              dias_rotina: opcoesTarefa.diasRotina,
            })
            .select()

          // Criar instâncias da rotina para os próximos dias marcados
          if (rotinaMae && rotinaMae.length > 0) {
            const tarefasRotina = gerarInstanciasRotina(
              rotinaMae[0].id,
              conteudo,
              c,
              opcoesTarefa.diasRotina
            )
            if (tarefasRotina.length > 0) {
              await supabase.from('tarefa').insert(tarefasRotina)
            }
          }
          await carregar()
        } else {
          // Tarefa normal (com opção de delegação)
          await supabase.from('tarefa').insert({
            titulo: conteudo,
            data: dataInserção,
            classificacao: c,
            delegada_para: opcoesTarefa.ehDelegada ? opcoesTarefa.delegadaPara : null,
            prazo_delegacao: opcoesTarefa.ehDelegada ? opcoesTarefa.prazoDelegacao : null,
            status_delegacao: opcoesTarefa.ehDelegada ? 'delegada' : 'nao_delegada',
          })
          await carregar()
        }
      }
      setTexto('')
      setOpcoesTarefa({
        ehRotina: false,
        diasRotina: [],
        ehDelegada: false,
        delegadaPara: null,
        prazoDelegacao: null,
      })
    } finally {
      setSalvando(false)
    }
  }

  // Compartilhado entre voz ao vivo (Web Speech API) e arquivo enviado
  // (Whisper): depois de ter um texto transcrito, os dois caminhos convergem
  // para a mesma interpretação (API Claude) e o mesmo modal de confirmação.
  async function interpretarEAbrirModal(textoTranscrito: string) {
    setInterpretando(true)
    try {
      const resultado = await interpretar(textoTranscrito)
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
  }

  async function aoSelecionarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    const erroValidacao = validarArquivoAudio(arquivo)
    if (erroValidacao) {
      setErroArquivo(erroValidacao)
      return
    }
    setErroArquivo('')
    setTranscrevendoArquivo(true)
    try {
      const textoTranscrito = await transcreverAudio(arquivo, arquivo.name)
      await interpretarEAbrirModal(textoTranscrito)
    } catch (excecao) {
      setErroArquivo(
        excecao instanceof ErroTranscricao ? excecao.message : 'Erro ao transcrever o áudio.'
      )
    } finally {
      setTranscrevendoArquivo(false)
    }
  }

  const listaTriagem = atrasadas.filter((t) => !mantidas.has(t.id))
  let listaDia = ordenarTarefas(tarefas)
  if (filtros.delegadas) {
    listaDia = listaDia.filter((t) => t.delegada_para)
  }
  if (filtros.rotinas) {
    listaDia = listaDia.filter((t) => t.eh_rotina)
  }
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
        {(filtros.delegadas || filtros.rotinas) && (
          <FiltrosHoje
            filtrosAtivos={filtros}
            onMudarFiltro={(tipo, ativo) => {
              setFiltros((prev) => ({ ...prev, [tipo]: ativo }))
            }}
          />
        )}
        {carregando ? (
          <ul>
            <SkeletonTarefa />
            <SkeletonTarefa />
            <SkeletonTarefa />
          </ul>
        ) : listaDia.length === 0 ? (
          <div className="vazio">
            <p>{filtros.delegadas || filtros.rotinas ? 'Nenhuma tarefa com esses filtros.' : 'Nenhuma tarefa para hoje.'}</p>
            <p className="texto-suave">
              {!filtros.delegadas && !filtros.rotinas && 'Digite abaixo o que precisa ser feito e escolha a importância — só isso.'}
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
                {renderarIndicadores(t)}
                {t.delegada_para && (
                  <MenuStatusDelegacao
                    tarefa={t}
                    onMudarStatus={async (novoStatus) => {
                      try {
                        await mudarStatusDelegacao(t.id, novoStatus)
                        await carregar()
                      } catch (erro) {
                        console.error('Erro ao mudar status:', erro)
                      }
                    }}
                  />
                )}
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
                <>
                  <button
                    className="botao-secundario"
                    disabled={!texto.trim() || salvando}
                    onClick={() => setMostrarOpcoes(true)}
                  >
                    ⚙️ Opções
                  </button>
                  {CLASSIFICACOES.map((c) => (
                    <button
                      key={c}
                      className={`botao-classificacao ${c}`}
                      disabled={!texto.trim() || salvando}
                      onClick={() => salvar(c)}
                    >
                      {ROTULO_CLASSIFICACAO[c]}
                    </button>
                  ))}
                </>
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
                    onClick={() => interpretarEAbrirModal(vozEstado.transcricao)}
                    disabled={interpretando}
                  >
                    {interpretando ? 'Interpretando…' : 'Confirmar'}
                  </button>
                </>
              )}
            </div>

            {!vozEstado.escutando && (
              <div className="painel-audio">
                <button
                  className="chip"
                  onClick={() => arquivoInputRef.current?.click()}
                  disabled={transcrevendoArquivo}
                >
                  📎 Ou enviar um arquivo de áudio
                </button>
                <input
                  ref={arquivoInputRef}
                  type="file"
                  accept={ACCEPT_INPUT_ARQUIVO}
                  className="input-oculto"
                  onChange={aoSelecionarArquivo}
                />
                {transcrevendoArquivo && <p className="texto-suave">Transcrevendo áudio…</p>}
                {erroArquivo && <p className="mensagem-erro">{erroArquivo}</p>}
                <p className="texto-suave formatos-aceitos">
                  Formatos aceitos: {FORMATOS_ACEITOS.join(', ')} — inclui notas de voz do
                  WhatsApp (.opus/.ogg).
                </p>
              </div>
            )}
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
                origem: 'voz',
              })
              await carregar()
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

      <ModalOpcoesTarefa
        aberto={mostrarOpcoes}
        titulo={texto}
        classificacao={ultimaClassificacao.current}
        data={diaAlvo}
        onCancelar={() => setMostrarOpcoes(false)}
        onConfirmar={(dados) => {
          setOpcoesTarefa({
            ehRotina: dados.ehRotina,
            diasRotina: dados.diasRotina,
            ehDelegada: dados.ehDelegada,
            delegadaPara: dados.delegadaPara,
            prazoDelegacao: dados.prazoDelegacao,
          })
          setMostrarOpcoes(false)
        }}
      />
    </div>
  )
}
