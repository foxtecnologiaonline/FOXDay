// FOXDay — transcrição de áudio em texto (captura por voz, Fase 1).
//
// Recebe um arquivo de áudio (form field "audio") e devolve o texto
// transcrito, usando a API de transcrição da OpenAI (whisper-1). Roda no
// servidor para manter a chave da OpenAI fora do app cliente.
//
// Formatos aceitos pela API: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav,
// webm. WhatsApp exporta notas de voz como .opus, mas o conteúdo é um
// contêiner OGG/Opus válido — a API só reconhece pela extensão, então o
// arquivo é reencaminhado com nome .ogg quando chega como .opus.
//
// Requer o secret OPENAI_API_KEY configurado no projeto Supabase:
//   supabase secrets set OPENAI_API_KEY=sk-... --project-ref <ref>

const FORMATOS_ACEITOS = [
  'mp3',
  'mp4',
  'mpeg',
  'mpga',
  'm4a',
  'wav',
  'webm',
  'ogg',
  'oga',
  'opus',
  'flac',
]

const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function respostaErro(mensagem: string, status: number) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function extensaoDoArquivo(nome: string): string {
  return (nome.split('.').pop() ?? '').toLowerCase()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return respostaErro('Método não permitido.', 405)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return respostaErro('Corpo da requisição inválido — envie multipart/form-data.', 400)
  }

  const arquivo = formData.get('audio')
  if (!(arquivo instanceof File)) {
    return respostaErro('Nenhum arquivo de áudio enviado (campo "audio").', 400)
  }

  if (arquivo.size === 0) {
    return respostaErro('Arquivo de áudio vazio.', 400)
  }

  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return respostaErro('Arquivo muito grande — o limite é 25MB.', 400)
  }

  const extensao = extensaoDoArquivo(arquivo.name)
  if (!FORMATOS_ACEITOS.includes(extensao)) {
    return respostaErro(
      `Formato ".${extensao}" não suportado. Use: ${FORMATOS_ACEITOS.join(', ')}.`,
      400
    )
  }

  const chaveOpenAI = Deno.env.get('OPENAI_API_KEY')
  if (!chaveOpenAI) {
    console.error('OPENAI_API_KEY não configurada nos secrets da função.')
    return respostaErro('Serviço de transcrição não configurado.', 500)
  }

  const nomeParaEnvio = extensao === 'opus' ? arquivo.name.replace(/\.opus$/i, '.ogg') : arquivo.name

  const corpoOpenAI = new FormData()
  corpoOpenAI.append('file', arquivo, nomeParaEnvio)
  corpoOpenAI.append('model', 'whisper-1')
  corpoOpenAI.append('language', 'pt')
  corpoOpenAI.append('response_format', 'json')

  let respostaOpenAI: Response
  try {
    respostaOpenAI = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chaveOpenAI}` },
      body: corpoOpenAI,
    })
  } catch (erro) {
    console.error('Falha de rede ao chamar a OpenAI:', erro)
    return respostaErro('Não foi possível contatar o serviço de transcrição.', 502)
  }

  if (!respostaOpenAI.ok) {
    const detalhe = await respostaOpenAI.text()
    console.error('Erro da API da OpenAI:', respostaOpenAI.status, detalhe)
    return respostaErro('Não foi possível transcrever este áudio. Tente novamente.', 502)
  }

  const dados = await respostaOpenAI.json()
  const texto = typeof dados.text === 'string' ? dados.text.trim() : ''

  return new Response(JSON.stringify({ texto }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
