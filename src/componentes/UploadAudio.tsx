import { useRef, useState } from 'react'
import { useTranscricao, useValidarDuracaoAudio } from '../hooks/useTranscricao'

interface Props {
  onTranscricaoSucesso: (texto: string, duracao: number) => void
  onErro?: (erro: string) => void
}

export default function UploadAudio({ onTranscricaoSucesso, onErro }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragover, setDragover] = useState(false)
  const { transcrever, processando, erro, progresso } = useTranscricao()
  const { validar: validarDuracao } = useValidarDuracaoAudio()

  const procesarArquivo = async (arquivo: File) => {
    try {
      // Validar duração antes de transcrever
      const { duracao, erro: erroDuracao } = await validarDuracao(arquivo)
      if (erroDuracao) {
        onErro?.(erroDuracao)
        return
      }

      // Transcrever via Whisper
      const transcricao = await transcrever(arquivo)
      if (transcricao) {
        onTranscricaoSucesso(transcricao, Math.round(duracao))
      } else if (onErro) {
        onErro('Falha ao transcrever o áudio. Tente novamente.')
      }
    } catch (err) {
      onErro?.((err as Error).message || 'Erro ao processar arquivo')
    }
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const arquivo = files[0]
    await procesarArquivo(arquivo)

    // Limpar input para permitir re-upload do mesmo arquivo
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragover(false)

    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragover(true)
  }

  const handleDragLeave = () => {
    setDragover(false)
  }

  return (
    <div className="upload-audio-container">
      {processando ? (
        <div className="upload-processando">
          <div className="spinner"></div>
          <p>Transcrevendo...</p>
          <div className="progresso-bar">
            <div className="progresso-fill" style={{ width: `${progresso}%` }}></div>
          </div>
          <span className="progresso-texto">{progresso}%</span>
        </div>
      ) : erro ? (
        <div className="upload-erro">
          <span className="icone-erro">⚠️</span>
          <p className="mensagem-erro">{erro.mensagem}</p>
          <button
            className="botao-tentar-novamente"
            onClick={() => inputRef.current?.click()}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div
            className={`upload-dropzone ${dragover ? 'dragover' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                inputRef.current?.click()
              }
            }}
          >
            <div className="upload-icone">🎤</div>
            <h3>Arraste um arquivo de áudio</h3>
            <p className="upload-hint">ou clique para selecionar</p>
            <p className="upload-formatos">MP3, WAV, OGG, M4A, FLAC (até 50MB)</p>
            <p className="upload-duracao">Duração: 3s a 10 minutos</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            style={{ display: 'none' }}
            aria-label="Selecionar arquivo de áudio"
          />
        </>
      )}
    </div>
  )
}
