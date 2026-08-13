import { supabase } from './supabase'
import { TAMANHO_MAXIMO_BYTES, extensaoDoArquivo, formatoAceito } from './audio'

export class ErroTranscricao extends Error {}

// Valida no cliente antes de gastar banda/custo com um arquivo que a API
// vai rejeitar de qualquer forma.
export function validarArquivoAudio(arquivo: File): string | null {
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return 'Arquivo muito grande — o limite é 25MB.'
  }
  if (!formatoAceito(arquivo.name)) {
    return `Formato ".${extensaoDoArquivo(arquivo.name)}" não suportado.`
  }
  return null
}

export async function transcreverAudio(blob: Blob, nomeArquivo: string): Promise<string> {
  const formData = new FormData()
  formData.append('audio', blob, nomeArquivo)

  const { data, error } = await supabase.functions.invoke('transcrever-audio', {
    body: formData,
  })

  if (error) {
    throw new ErroTranscricao('Não foi possível transcrever o áudio. Tente novamente.')
  }
  if (data?.erro) {
    throw new ErroTranscricao(data.erro)
  }
  const texto = typeof data?.texto === 'string' ? data.texto.trim() : ''
  if (!texto) {
    throw new ErroTranscricao('Não entendi nenhuma fala nesse áudio.')
  }
  return texto
}
