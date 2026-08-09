import { lazy, Suspense, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from './lib/supabase'
import ErrorBoundary from './ComponenteErro'
import Entrar from './telas/Entrar'

// Lazy-load telas de navegação (carregadas sob demanda)
const Hoje = lazy(() => import('./telas/Hoje'))
const Relatorio = lazy(() => import('./telas/Relatorio'))
const Historico = lazy(() => import('./telas/Historico'))
const Config = lazy(() => import('./telas/Config'))

export interface Perfil {
  id: string
  nome: string
  profissao: string
  horario_relatorio: string
}

type Aba = 'hoje' | 'relatorio' | 'historico' | 'config'

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'hoje', rotulo: 'Hoje', icone: '☀️' },
  { id: 'relatorio', rotulo: 'Relatório', icone: '📊' },
  { id: 'historico', rotulo: 'Histórico', icone: '🗓️' },
  { id: 'config', rotulo: 'Ajustes', icone: '⚙️' },
]

export default function App() {
  const [carregando, setCarregando] = useState(true)
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [aba, setAba] = useState<Aba>('hoje')

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCarregando(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data: escuta } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => escuta.subscription.unsubscribe()
  }, [])

  const idUsuario = sessao?.user.id
  useEffect(() => {
    if (!idUsuario) {
      setPerfil(null)
      return
    }
    supabase
      .from('perfil')
      .select('*')
      .eq('id', idUsuario)
      .single()
      .then(({ data }) => setPerfil(data))
  }, [idUsuario])

  if (!supabaseConfigurado) {
    return (
      <div className="tela-central">
        <h1 className="logo">FOXDay</h1>
        <p>
          Backend não configurado. Copie <code>.env.example</code> para <code>.env</code> e
          preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> com as
          credenciais do projeto Supabase.
        </p>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="tela-central">
        <h1 className="logo">FOXDay</h1>
      </div>
    )
  }

  if (!sessao) return <Entrar />

  return (
    <ErrorBoundary>
      <div className="app">
        <main className="conteudo">
          <Suspense fallback={<div className="tela-central"><p>Carregando…</p></div>}>
            {aba === 'hoje' && <Hoje perfil={perfil} irParaRelatorio={() => setAba('relatorio')} />}
            {aba === 'relatorio' && <Relatorio />}
            {aba === 'historico' && <Historico />}
            {aba === 'config' && (
              <Config perfil={perfil} email={sessao.user.email ?? ''} aoAtualizar={setPerfil} />
            )}
          </Suspense>
        </main>
        <nav className="barra-nav">
          {ABAS.map((a) => (
            <button
              key={a.id}
              className={aba === a.id ? 'nav-item ativo' : 'nav-item'}
              onClick={() => setAba(a.id)}
            >
              <span className="nav-icone" aria-hidden>
                {a.icone}
              </span>
              {a.rotulo}
            </button>
          ))}
        </nav>
      </div>
    </ErrorBoundary>
  )
}
