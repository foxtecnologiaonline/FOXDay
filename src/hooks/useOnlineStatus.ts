import { useEffect, useState, useCallback } from 'react'
import { log } from '../lib/log'

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => {
    // Verificar status inicial
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  })

  const handleOnline = useCallback(() => {
    log('Voltou online')
    setOnline(true)
    // Dispara evento customizado que syncManager pode ouvir
    window.dispatchEvent(new Event('foxday-online'))
  }, [])

  const handleOffline = useCallback(() => {
    log('Entrou em modo offline')
    setOnline(false)
    // Dispara evento customizado para informar mudança de estado
    window.dispatchEvent(new Event('foxday-offline'))
  }, [])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return online
}
