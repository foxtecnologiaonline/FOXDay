import { useCallback, useState } from 'react'
import { logErro } from '../lib/log'

interface VozEstado {
  escutando: boolean
  processando: boolean
  transcricao: string
  erro: string | null
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function useVozCaptura() {
  const [estado, setEstado] = useState<VozEstado>({
    escutando: false,
    processando: false,
    transcricao: '',
    erro: null,
  })

  const iniciar = useCallback(() => {
    const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as any

    if (!SpeechRecognition) {
      const msg = 'Web Speech API não suportada neste browser'
      setEstado((prev) => ({ ...prev, erro: msg }))
      logErro('useVozCaptura', new Error(msg))
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    setEstado({
      escutando: true,
      processando: false,
      transcricao: '',
      erro: null,
    })

    recognition.onstart = () => {
      setEstado((prev) => ({ ...prev, escutando: true, erro: null }))
    }

    recognition.onresult = (event: any) => {
      let transcricao = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcricao += event.results[i][0].transcript
      }
      setEstado((prev) => ({ ...prev, transcricao: transcricao.trim() }))
    }

    recognition.onerror = (event: any) => {
      const erroMsg = event.error === 'no-speech'
        ? 'Nenhuma fala detectada. Tente novamente.'
        : event.error === 'network'
        ? 'Erro de conexão. Verifique sua internet.'
        : `Erro: ${event.error}`

      setEstado((prev) => ({
        ...prev,
        erro: erroMsg,
        escutando: false,
      }))
      logErro('Speech Recognition error', new Error(erroMsg))
    }

    recognition.onend = () => {
      setEstado((prev) => ({ ...prev, escutando: false }))
    }

    try {
      recognition.start()
    } catch (e) {
      const msg = 'Erro ao iniciar captura de voz'
      setEstado((prev) => ({ ...prev, erro: msg, escutando: false }))
      logErro('useVozCaptura.start', e as Error)
    }
  }, [])

  const parar = useCallback(() => {
    setEstado((prev) => ({ ...prev, escutando: false }))
  }, [])

  const limpar = useCallback(() => {
    setEstado({
      escutando: false,
      processando: false,
      transcricao: '',
      erro: null,
    })
  }, [])

  const setProcessando = useCallback((processando: boolean) => {
    setEstado((prev) => ({ ...prev, processando }))
  }, [])

  return {
    estado,
    iniciar,
    parar,
    limpar,
    setProcessando,
  }
}
