// Formatos de áudio aceitos para transcrição — espelha exatamente o que a
// API de transcrição da OpenAI (whisper-1) suporta. WhatsApp exporta notas
// de voz como .opus (contêiner OGG/Opus), então é tratado como .ogg no
// servidor antes de enviar para a API.
export const FORMATOS_ACEITOS = [
  'mp3',
  'mp4',
  'mpeg',
  'mpga',
  'm4a',
  'wav',
  'webm',
  'ogg',
  'oga',
  'opus', // WhatsApp (Android/Desktop) — reencaminhado como .ogg no backend
  'flac',
] as const

export const ACCEPT_INPUT_ARQUIVO = FORMATOS_ACEITOS.map((f) => `.${f}`).join(',')

export const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024 // limite da API da OpenAI

export function extensaoDoArquivo(nome: string): string {
  return (nome.split('.').pop() ?? '').toLowerCase()
}

export function formatoAceito(nome: string): boolean {
  return (FORMATOS_ACEITOS as readonly string[]).includes(extensaoDoArquivo(nome))
}
