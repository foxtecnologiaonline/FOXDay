import { useEffect, useState } from 'react'
import type { Classificacao } from '../lib/dominio'
import type { InterpretacaoVoz } from '../lib/claude'
import { getClaudeClient } from '../lib/claude'
import { logErro } from '../lib/log'

interface Props {
  transcricao: string
  duracao: number
  onConfirmar: (dados: InterpretacaoVoz) => void
  onCancelar: () => void
  onEditarTranscricao?: (novaTranscricao: string) => void
}

export default function ModalConfirmarAudio({
  transcricao,
  duracao,
  onConfirmar,
  onCancelar,
  onEditarTranscricao,
}: Props) {
  const [interpretacao, setInterpretacao] = useState<InterpretacaoVoz | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [transcricaoEditada, setTranscricaoEditada] = useState(transcricao)
  const [editando, setEditando] = useState(false)

  // Interpretar transcrição ao montar
  useEffect(() => {
    interpretar()
  }, [transcricao])

  const interpretar = async () => {
    try {
      setCarregando(true)
      setErro(null)

      const claudeClient = getClaudeClient()
      const resultado = await claudeClient.interpretarVoz(transcricaoEditada || transcricao)

      setInterpretacao(resultado)
    } catch (err) {
      const mensagem =
        err instanceof Error
          ? err.message
          : 'Erro ao interpretar áudio. Verifique e confirme os dados manualmente.'
      setErro(mensagem)
      logErro('ModalConfirmarAudio: erro ao interpretar', err as Error)

      // Fallback: criar interpretação padrão
      setInterpretacao({
        texto: transcricaoEditada || transcricao,
        classificacao: 'circunstancial' as Classificacao,
        data: 'hoje',
        confianca: 0,
      })
    } finally {
      setCarregando(false)
    }
  }

  const handleConfirmar = () => {
    if (interpretacao) {
      const resultadoFinal = {
        ...interpretacao,
        texto: transcricaoEditada || transcricao,
      }
      onConfirmar(resultadoFinal)
    }
  }

  const handleSalvarEdicao = () => {
    onEditarTranscricao?.(transcricaoEditada)
    setEditando(false)
    interpretar()
  }

  const formatarConfianca = (valor: number): string => {
    if (valor === 0) return 'Baixa confiança'
    if (valor < 50) return 'Moderada'
    if (valor < 80) return 'Boa'
    return 'Muito boa'
  }

  const traduzirData = (data: string): string => {
    return data === 'hoje' ? 'Hoje' : data === 'amanha' ? 'Amanhã' : data
  }

  const traduzirClassificacao = (classe: Classificacao): string => {
    const mapa: Record<Classificacao, string> = {
      importante: 'Importante',
      urgente: 'Urgente',
      circunstancial: 'Circunstancial',
    }
    return mapa[classe] || classe
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-confirmar-audio" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmar Áudio</h2>
          <button
            className="botao-fechar"
            onClick={onCancelar}
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-content">
          {/* Transcrição */}
          <div className="secao-transcricao">
            <h3>Transcrição</h3>
            {editando ? (
              <div className="edit-transcricao">
                <textarea
                  value={transcricaoEditada}
                  onChange={(e) => setTranscricaoEditada(e.target.value)}
                  rows={3}
                  className="textarea-edicao"
                  autoFocus
                />
                <div className="botoes-edicao">
                  <button className="botao-cancelar" onClick={() => setEditando(false)}>
                    Cancelar
                  </button>
                  <button className="botao-salvar" onClick={handleSalvarEdicao}>
                    Salvar & Reinterpretar
                  </button>
                </div>
              </div>
            ) : (
              <div className="transcricao-display">
                <p className="texto-transcrito">{transcricaoEditada}</p>
                <button
                  className="botao-editar"
                  onClick={() => setEditando(true)}
                  aria-label="Editar transcrição"
                >
                  ✎ Editar
                </button>
              </div>
            )}
            <span className="duracao-audio">
              ⏱️ {Math.floor(duracao / 60)}:{String(duracao % 60).padStart(2, '0')}
            </span>
          </div>

          {/* Interpretação */}
          <div className="secao-interpretacao">
            <h3>Interpretação</h3>

            {carregando ? (
              <div className="interpretacao-carregando">
                <div className="spinner-pequeno"></div>
                <p>Interpretando...</p>
              </div>
            ) : erro ? (
              <div className="interpretacao-erro">
                <p className="aviso">{erro}</p>
                <p className="hint">Você pode editar a transcrição e confirmar manualmente.</p>
              </div>
            ) : interpretacao ? (
              <div className="interpretacao-dados">
                <div className="interpretacao-item">
                  <span className="label">📝 Tarefa:</span>
                  <span className="valor">{interpretacao.texto}</span>
                </div>

                <div className="interpretacao-item">
                  <span className="label">📅 Data:</span>
                  <span className="valor">{traduzirData(interpretacao.data)}</span>
                </div>

                <div className="interpretacao-item">
                  <span className="label">🏷️ Classificação:</span>
                  <span className={`valor selo ${interpretacao.classificacao}`}>
                    {traduzirClassificacao(interpretacao.classificacao)}
                  </span>
                </div>

                <div className="interpretacao-item confianca">
                  <span className="label">🎯 Confiança:</span>
                  <div className="confianca-bar">
                    <div
                      className={`confianca-fill conf-${Math.round(interpretacao.confianca / 25) * 25}`}
                      style={{ width: `${interpretacao.confianca}%` }}
                    ></div>
                  </div>
                  <span className="confianca-texto">
                    {interpretacao.confianca}% ({formatarConfianca(interpretacao.confianca)})
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="modal-footer">
          <button className="botao-cancelar" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className="botao-confirmar"
            onClick={handleConfirmar}
            disabled={carregando || !interpretacao}
          >
            Confirmar & Criar Tarefa
          </button>
        </div>
      </div>
    </div>
  )
}
