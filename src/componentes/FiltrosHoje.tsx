interface Props {
  filtrosAtivos: { delegadas?: boolean; rotinas?: boolean }
  onMudarFiltro: (tipo: 'delegadas' | 'rotinas', ativo: boolean) => void
}

export default function FiltrosHoje({ filtrosAtivos, onMudarFiltro }: Props) {
  return (
    <div className="filtros-hoje">
      <button
        className={`chip ${filtrosAtivos.delegadas ? 'ativo' : ''}`}
        onClick={() => onMudarFiltro('delegadas', !filtrosAtivos.delegadas)}
      >
        👤 Delegadas
      </button>
      <button
        className={`chip ${filtrosAtivos.rotinas ? 'ativo' : ''}`}
        onClick={() => onMudarFiltro('rotinas', !filtrosAtivos.rotinas)}
      >
        🔄 Rotinas
      </button>
    </div>
  )
}
