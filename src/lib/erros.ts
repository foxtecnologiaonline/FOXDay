// Tipos de erro estruturados para o FOXDay

export enum TipoErro {
  REDE = 'rede',
  AUTENTICACAO = 'autenticacao',
  VALIDACAO = 'validacao',
  PERMISSAO = 'permissao',
  BANCO_DADOS = 'banco_dados',
  DESCONHECIDO = 'desconhecido',
}

export interface ErroFoxDay {
  tipo: TipoErro
  mensagem: string
  detalhes?: string
  original?: any
  tentativa?: number
}

export function classificarErro(erro: any): ErroFoxDay {
  // Erro de rede
  if (
    erro instanceof TypeError &&
    (erro.message.includes('fetch') || erro.message.includes('network'))
  ) {
    return {
      tipo: TipoErro.REDE,
      mensagem: 'Erro de conexão. Verificando...',
      detalhes: erro.message,
      original: erro,
    }
  }

  // Erro Supabase
  if (erro?.status) {
    if (erro.status === 401 || erro.status === 403) {
      return {
        tipo: TipoErro.AUTENTICACAO,
        mensagem: 'Autenticação falhou. Faça login novamente.',
        detalhes: erro.message,
        original: erro,
      }
    }

    if (erro.status === 400) {
      return {
        tipo: TipoErro.VALIDACAO,
        mensagem: 'Dados inválidos. Verifique e tente novamente.',
        detalhes: erro.message,
        original: erro,
      }
    }

    if (erro.status >= 500) {
      return {
        tipo: TipoErro.BANCO_DADOS,
        mensagem: 'Erro do servidor. Tente novamente em alguns segundos.',
        detalhes: erro.message,
        original: erro,
      }
    }
  }

  // Erro de permissão RLS
  if (erro?.message?.includes('RLS') || erro?.code === 'PGRST301') {
    return {
      tipo: TipoErro.PERMISSAO,
      mensagem: 'Você não tem permissão para essa ação.',
      detalhes: erro.message,
      original: erro,
    }
  }

  // Padrão: desconhecido
  return {
    tipo: TipoErro.DESCONHECIDO,
    mensagem: 'Algo deu errado. Tente novamente.',
    detalhes: erro?.message || String(erro),
    original: erro,
  }
}

export function ehErroDeRede(erro: ErroFoxDay): boolean {
  return erro.tipo === TipoErro.REDE
}

export function ehErroRetentavel(erro: ErroFoxDay): boolean {
  return ehErroDeRede(erro) || erro.tipo === TipoErro.BANCO_DADOS
}

export function mensagemUsuario(erro: ErroFoxDay): string {
  // Mensagens simples, mobile-first
  const msgs = {
    [TipoErro.REDE]: 'Sem conexão',
    [TipoErro.AUTENTICACAO]: 'Sessão expirada',
    [TipoErro.VALIDACAO]: 'Dados inválidos',
    [TipoErro.PERMISSAO]: 'Sem permissão',
    [TipoErro.BANCO_DADOS]: 'Servidor indisponível',
    [TipoErro.DESCONHECIDO]: 'Erro inesperado',
  }
  return msgs[erro.tipo]
}
