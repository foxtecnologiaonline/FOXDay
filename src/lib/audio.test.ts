import { describe, expect, it } from 'vitest'
import { FORMATOS_ACEITOS, extensaoDoArquivo, formatoAceito } from './audio'

describe('extensaoDoArquivo', () => {
  it('extrai a extensão em minúsculas', () => {
    expect(extensaoDoArquivo('nota-de-voz.OPUS')).toBe('opus')
    expect(extensaoDoArquivo('audio.WhatsApp Ptt 2026-08-08.opus')).toBe('opus')
  })

  it('lida com nomes sem extensão', () => {
    expect(extensaoDoArquivo('semextensao')).toBe('semextensao')
  })
})

describe('formatoAceito', () => {
  it('aceita todos os formatos suportados pela API de transcrição', () => {
    for (const formato of FORMATOS_ACEITOS) {
      expect(formatoAceito(`arquivo.${formato}`)).toBe(true)
    }
  })

  it('aceita nota de voz do WhatsApp (.opus)', () => {
    expect(formatoAceito('PTT-20260808-WA0001.opus')).toBe(true)
  })

  it('rejeita formatos não suportados', () => {
    expect(formatoAceito('audio.amr')).toBe(false)
    expect(formatoAceito('audio.aiff')).toBe(false)
    expect(formatoAceito('documento.pdf')).toBe(false)
  })
})
