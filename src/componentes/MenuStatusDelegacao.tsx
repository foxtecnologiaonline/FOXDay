import type { StatusDelegacao } from '../lib/dominio'
import type { Tarefa } from '../lib/dominio'

interface Props {
  tarefa: Tarefa
  onMudarStatus: (novoStatus: StatusDelegacao) => Promise<void>
  carregando?: boolean
}

export default function MenuStatusDelegacao({ tarefa, onMudarStatus, carregando = false }: Props) {
  const statusOptions: { valor: StatusDelegacao; icone: string; label: string }[] = [
    { valor: 'nao_delegada', icone: '○', label: 'Não delegada' },
    { valor: 'delegada', icone: '◐', label: 'Delegada' },
    { valor: 'cumprida', icone: '✓', label: 'Cumprida' },
    { valor: 'nao_cumprida', icone: '✗', label: 'Não cumprida' },
  ]

  const statusAtual = tarefa.status_delegacao ?? 'nao_delegada'

  return (
    <div className="menu-status-delegacao">
      {statusOptions.map((option) => (
        <button
          key={option.valor}
          className={`status-button ${statusAtual === option.valor ? 'ativo' : ''}`}
          onClick={() => onMudarStatus(option.valor)}
          disabled={carregando || statusAtual === option.valor}
          title={option.label}
        >
          {option.icone}
        </button>
      ))}
    </div>
  )
}
