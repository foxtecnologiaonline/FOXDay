import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Perfil } from '../App'
import { supabase } from '../lib/supabase'
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
  pendentesAnteriores,
  type Classificacao,
  type Observacao,
  type Origem,
  type Tarefa,
} from '../lib/dominio'
import { ACCEPT_INPUT_ARQUIVO, FORMATOS_ACEITOS } from '../lib/audio'
import {
  ErroTranscricao,
  extensaoParaMimeType,
  mimeTypeSuportado,
  transcreverAudio,
  validarArquivoAudio,
} from '../lib/transcricao'

interface Props {
  perfil: Perfil | null
  irParaRelatorio: () => void
}

export default function Hoje({ perfil, irParaRelatorio }: Props) {
  const hoje = hojeISO()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [atrasadas, setAtrasadas] = useState<Tarefa[]>([])
  const [mantidas, setMantidas] = useState<Set<string>>(new Set())
  const [observacoes, setObservacoes] = useState<Observacao[]>([])
  const [diaFechado, setDiaFechado] = useState(true)
  const [carregando, setCarregando] = useState(true)

  const [texto, setTexto] = useState('')
  const [origemAtual, setOrigemAtual] = useState<Origem>('texto')
  const [modo, setModo] = useState<'tarefa' | 'obs'>('tarefa')
  const [diaAlvo, setDiaAlvo] = useState<'hoje' | 'amanha'>('hoje')
  const [salvando, setSalvando] = useState(false)
  const ultimaClassificacao = useRef<Classificacao>('importante')

  const [painelAudioAberto, setPainelAudioAberto] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [transcrevendo, setTranscrevendo] = useState(false)
  const [erroAudio, setErroAudio] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const arquivoInputRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    const [tHoje, tAtrasadas, obs, rel] = await Promise.all([
      supabase
        .from('tarefa')
        .select('*')
        .eq('data', hoje)
        .neq('status', 'descartada')
        .order('criada_em'),
      supabase.from('tarefa').select('*').lt('data', hoje).eq('status', 'pendente').order('data'),
      supabase.from('observacao').select('*').eq('data', hoje).order('criado_em'),
      supabase.from('relatorio_dia').select('id').eq('data', hoje).maybeSingle(),
    ])
    setTarefas((tHoje.data as Tarefa[]) ?? [])
    setAtrasadas(pendentesAnteriores((tAtrasadas.data as Tarefa[]) ?? [], hoje))
    setObservacoes((obs.data as Observacao[]) ?? [])
    setDiaFechado(Boolean(rel.data))
    setCarregando(false)
  }, [hoje])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar(classificacao?: Classificacao) {
    const conteudo = texto.trim()
    if (!conteudo || salvando) return
    setSalvando(true)
    try {
      if (modo === 'obs') {
        await supabase
          .from('observacao')
          .insert({ texto: conteudo, data: hoje, origem: origemAtual })
      } else {
        const c = classificacao ?? ultimaClassificacao.current
        ultimaClassificacao.current = c
        await supabase.from('tarefa').insert({
          titulo: conteudo,
          data: diaAlvo === 'hoje' ? hoje : adicionarDias(hoje, 1),
          classificacao: c,
          origem: origemAtual,
        })
      }
      setTexto('')
      setOrigemAtual('texto')
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  // Compartilhado entre gravação ao vivo e upload de arquivo: manda o áudio
  // para a função de transcrição e preenche o campo de captura (o usuário
  // ainda revisa e confirma antes de salvar — a IA sugere, não decide).
  async function processarAudio(blob: Blob, nomeArquivo: string) {
    setTranscrevendo(true)
    setErroAudio('')
    try {
      const resultado = await transcreverAudio(blob, nomeArquivo)
      setTexto(resultado)
      setOrigemAtual('voz')
      setPainelAudioAberto(false)
    } catch (excecao) {
      setErroAudio(
        excecao instanceof ErroTranscricao ? excecao.message : 'Erro ao transcrever o áudio.'
      )
    } finally {
      setTranscrevendo(false)
    }
  }

  async function iniciarGravacao() {
    setErroAudio('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = mimeTypeSuportado()
      const gravador = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      gravador.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      gravador.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        const tipo = gravador.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: tipo })
        void processarAudio(blob, `gravacao.${extensaoParaMimeType(tipo)}`)
      }
      gravador.start()
      mediaRecorderRef.current = gravador
      setGravando(true)
    } catch {
      setErroAudio('Não foi possível acessar o microfone.')
    }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop()
    setGravando(false)
  }

  function aoSelecionarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    const erro = validarArquivoAudio(arquivo)
    if (erro) {
      setErroAudio(erro)
      return
    }
    void processarAudio(arquivo, arquivo.name)
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function alternarConclusao(t: Tarefa) {
    const concluir = t.status !== 'concluida'
    await supabase
      .from('tarefa')
      .update({
        status: concluir ? 'concluida' : 'pendente',
        concluida_em: concluir ? new Date().toISOString() : null,
      })
      .eq('id', t.id)
    await carregar()
  }

  async function descartar(t: Tarefa) {
    await supabase.from('tarefa').update({ status: 'descartada' }).eq('id', t.id)
    await carregar()
  }

  async function reagendarParaHoje(t: Tarefa) {
    await supabase.from('tarefa').update({ data: hoje }).eq('id', t.id)
    await carregar()
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
                  <button onClick={() => reagendarParaHoje(t)}>→ Hoje</button>
                  <button onClick={() => setMantidas(new Set([...mantidas, t.id]))}>Manter</button>
                  <button className="perigo" onClick={() => descartar(t)}>
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
          <p className="texto-suave">Carregando…</p>
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
                    onChange={() => alternarConclusao(t)}
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
                    onClick={() => descartar(t)}
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
        <div className="captura-input-linha">
          <input
            className="captura-campo"
            placeholder={modo === 'tarefa' ? 'O que precisa ser feito?' : 'Anote uma observação…'}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setOrigemAtual('texto')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') salvar()
            }}
          />
          <button
            className={gravando ? 'botao-icone gravando' : 'botao-icone'}
            title="Áudio"
            aria-label="Capturar por áudio"
            onClick={() => setPainelAudioAberto((v) => !v)}
          >
            🎤
          </button>
        </div>

        {painelAudioAberto && (
          <div className="painel-audio">
            {transcrevendo ? (
              <p className="texto-suave">Transcrevendo áudio…</p>
            ) : gravando ? (
              <button className="botao-secundario" onClick={pararGravacao}>
                ⏹ Parar gravação
              </button>
            ) : (
              <div className="painel-audio-acoes">
                <button className="chip" onClick={iniciarGravacao}>
                  🔴 Gravar agora
                </button>
                <button className="chip" onClick={() => arquivoInputRef.current?.click()}>
                  📎 Enviar arquivo
                </button>
              </div>
            )}
            <input
              ref={arquivoInputRef}
              type="file"
              accept={ACCEPT_INPUT_ARQUIVO}
              className="input-oculto"
              onChange={aoSelecionarArquivo}
            />
            {erroAudio && <p className="mensagem-erro">{erroAudio}</p>}
            <p className="texto-suave formatos-aceitos">
              Formatos aceitos: {FORMATOS_ACEITOS.join(', ')} — inclui notas de voz do WhatsApp
              (.opus/.ogg).
            </p>
          </div>
        )}

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
      </div>
    </div>
  )
}
