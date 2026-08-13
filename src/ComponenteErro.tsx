import { Component, type ReactNode } from 'react'
import { logErro } from './lib/log'

interface Props {
  children: ReactNode
}

interface State {
  erroCapturado: boolean
  mensagem: string
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { erroCapturado: false, mensagem: '' }
  }

  static getDerivedStateFromError(erro: Error): State {
    return {
      erroCapturado: true,
      mensagem: erro.message || 'Erro inesperado',
    }
  }

  componentDidCatch(erro: Error) {
    logErro('Error Boundary capturou erro', erro)
  }

  render() {
    if (this.state.erroCapturado) {
      return (
        <div className="tela-central">
          <h1 className="logo">FOXDay</h1>
          <div style={{ textAlign: 'center', color: 'var(--vermelho, #cc0000)' }}>
            <p>💥 Algo deu errado</p>
            <p style={{ fontSize: '0.9em', opacity: 0.7 }}>{this.state.mensagem}</p>
            <button
              onClick={() => {
                this.setState({ erroCapturado: false, mensagem: '' })
                window.location.reload()
              }}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--laranja, #E8590C)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1em',
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
