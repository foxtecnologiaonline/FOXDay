// Sistema de logging estruturado para debug
// Logs apenas em desenvolvimento; opcionalmente persiste em localStorage para análise

const STORAGE_KEY = '__foxday_logs'
const MAX_LOGS = 100

interface LogEntry {
  timestamp: string
  nivel: 'info' | 'warn' | 'error'
  mensagem: string
  dados?: any
}

let logsBuffer: LogEntry[] = []

// Carregar logs anteriores na inicialização
if (typeof localStorage !== 'undefined') {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      logsBuffer = JSON.parse(saved)
    }
  } catch (e) {
    // Falha silenciosa ao recuperar logs
  }
}

function salvarNoStorage(entry: LogEntry) {
  if (typeof localStorage === 'undefined') return

  logsBuffer.push(entry)
  // Manter últimos MAX_LOGS
  if (logsBuffer.length > MAX_LOGS) {
    logsBuffer = logsBuffer.slice(-MAX_LOGS)
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logsBuffer))
  } catch (e) {
    // Falha silenciosa se storage está cheio
  }
}

export function log(
  mensagem: string,
  dados?: any,
  nivel: 'info' | 'warn' | 'error' = 'info'
) {
  const timestamp = new Date().toISOString()
  const entry: LogEntry = { timestamp, nivel, mensagem, dados }

  // Em dev: sempre logar no console
  if (import.meta.env.DEV) {
    const style = {
      info: 'color: #0066cc',
      warn: 'color: #ff9900',
      error: 'color: #cc0000',
    }[nivel]

    console.log(`%c[${nivel.toUpperCase()}] ${mensagem}`, style, dados || '')
  }

  // Sempre guardar no localStorage (até limite)
  salvarNoStorage(entry)
}

export function logErro(mensagem: string, erro?: any) {
  log(mensagem, { erro, stack: erro?.stack }, 'error')
}

export function logAviso(mensagem: string, dados?: any) {
  log(mensagem, dados, 'warn')
}

/**
 * Recuperar logs armazenados (útil para debug)
 */
export function obterLogs(filtroNivel?: 'info' | 'warn' | 'error'): LogEntry[] {
  if (filtroNivel) {
    return logsBuffer.filter((l) => l.nivel === filtroNivel)
  }
  return logsBuffer
}

/**
 * Limpar logs do localStorage
 */
export function limparLogs() {
  logsBuffer = []
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * Exportar logs como JSON para debug
 */
export function exportarLogs(): string {
  return JSON.stringify(logsBuffer, null, 2)
}
