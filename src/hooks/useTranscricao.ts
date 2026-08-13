import { useCallback, useState } from 'react'
import type { ErroFoxDay } from '../lib/erros'
import { TipoErro } from '../lib/erros'
import { logErro } from '../lib/log'

interface EstadoTranscricao {
  transcricao: string
  processando: boolean
  erro: ErroFoxDay | null
  progresso: number // 0-100
}

interface ResultadoWhisper {
  text: string
  language?: string
}

export function useTranscricao() {
  const [estado, setEstado] = useState<EstadoTranscricao>({
    transcricao: '',
    processando: false,
    erro: null,
    progresso: 0,
  })

  const transcrever = useCallback(async (arquivo: File): Promise<string | null> => {
    setEstado({
      transcricao: '',
      processando: true,
      erro: null,
      progresso: 0,
    })

    const apiKey = import.meta.env.VITE_WHISPER_API_KEY
    if (!apiKey) {
      const msg = 'VITE_WHISPER_API_KEY não configurada no .env'
      const erro: ErroFoxDay = { tipo: TipoErro.DESCONHECIDO, mensagem: msg, detalhes: 'Configuração', original: null }
      setEstado((prev) => ({ ...prev, erro, processando: false }))
      logErro('useTranscricao: apiKey não configurada', Error(msg))
      return null
    }

    // Validar arquivo antes de enviar
    const validacao = validarArquivo(arquivo)
    if (validacao.invalido) {
      const erro: ErroFoxDay = { tipo: TipoErro.VALIDACAO, mensagem: validacao.mensagem, detalhes: 'Arquivo inválido', original: null }
      setEstado((prev) => ({ ...prev, erro, processando: false }))
      logErro('useTranscricao: validação falhou', Error(validacao.mensagem))
      return null
    }

    // Enviar para Whisper API com retry manual
    let data: ResultadoWhisper | null = null
    let ultimoErro: any = null

    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const formData = new FormData()
        formData.append('file', arquivo)
        formData.append('model', 'whisper-1')
        formData.append('language', 'pt')

        setEstado((prev) => ({ ...prev, progresso: 30 }))

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            `Whisper API error: ${response.status} - ${errorData.error?.message || 'unknown'}`
          )
        }

        setEstado((prev) => ({ ...prev, progresso: 80 }))

        data = (await response.json()) as ResultadoWhisper
        break // Sucesso, sair do loop
      } catch (err) {
        ultimoErro = err
        if (tentativa < 2) {
          const delayMs = 3000 * Math.pow(2, tentativa - 1)
          await new Promise((r) => setTimeout(r, delayMs))
        }
      }
    }

    if (!data?.text || ultimoErro) {
      const mensagem = ultimoErro?.message || 'Transcrição vazia retornada'
      const erro: ErroFoxDay = { tipo: TipoErro.REDE, mensagem, detalhes: 'Falha ao transcrever', original: ultimoErro }
      setEstado((prev) => ({ ...prev, erro, processando: false }))
      logErro('useTranscricao: falha ao transcrever', mensagem instanceof Error ? mensagem : Error(mensagem))
      return null
    }

    const transcricaoLimpa = data.text.trim()

    if (!transcricaoLimpa) {
      const erro: ErroFoxDay = { tipo: TipoErro.VALIDACAO, mensagem: 'Nenhuma fala detectada no áudio', detalhes: 'Áudio vazio' }
      setEstado((prev) => ({ ...prev, erro, processando: false }))
      return null
    }

    setEstado({
      transcricao: transcricaoLimpa,
      processando: false,
      erro: null,
      progresso: 100,
    })

    return transcricaoLimpa
  }, [])

  const limpar = useCallback(() => {
    setEstado({
      transcricao: '',
      processando: false,
      erro: null,
      progresso: 0,
    })
  }, [])

  return {
    ...estado,
    transcrever,
    limpar,
  }
}

// ── Validação de arquivo ──────────────────────────────────────────────────

interface ValidacaoArquivo {
  invalido: boolean
  mensagem: string
}

function validarArquivo(arquivo: File): ValidacaoArquivo {
  // Validar tipo
  const tiposValidos = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/flac']
  if (!tiposValidos.includes(arquivo.type)) {
    return {
      invalido: true,
      mensagem: `Formato não suportado: ${arquivo.type}. Use MP3, WAV, OGG, M4A ou FLAC.`,
    }
  }

  // Validar tamanho (max 50MB)
  const maxTamanho = 50 * 1024 * 1024
  if (arquivo.size > maxTamanho) {
    return {
      invalido: true,
      mensagem: `Arquivo muito grande (${Math.round(arquivo.size / 1024 / 1024)}MB). Máximo: 50MB.`,
    }
  }

  // Validar tamanho mínimo (pelo menos 100KB para ser áudio útil)
  const minTamanho = 100 * 1024
  if (arquivo.size < minTamanho) {
    return {
      invalido: true,
      mensagem: 'Arquivo muito pequeno. Certifique-se que é um áudio real.',
    }
  }

  return { invalido: false, mensagem: '' }
}

/**
 * Hook auxiliar para validar duração de áudio
 * Detecta duração usando Web Audio API (não depende de metadados do arquivo)
 */
export function useValidarDuracaoAudio() {
  const validar = useCallback(async (arquivo: File): Promise<{ duracao: number; erro?: string }> => {
    try {
      const arrayBuffer = await arquivo.arrayBuffer()
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const duracao = audioBuffer.duration

      // Validar duração (3s-10min)
      if (duracao < 3) {
        return { duracao, erro: 'Áudio muito curto (< 3s). Fale mais.' }
      }

      if (duracao > 600) {
        return { duracao, erro: 'Áudio muito longo (> 10min). Divida em partes menores.' }
      }

      return { duracao }
    } catch (err) {
      logErro('useValidarDuracaoAudio: falha ao decodificar', err as Error)
      return {
        duracao: 0,
        erro: 'Não foi possível validar duração do áudio. Arquivo pode estar corrompido.',
      }
    }
  }, [])

  return { validar }
}
