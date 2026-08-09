interface Props {
  online: boolean
  sincronizando?: boolean
  pendentes?: number
  erroSync?: string
}

export default function StatusConexao({
  online,
  sincronizando = false,
  pendentes = 0,
  erroSync,
}: Props) {
  if (online && !sincronizando && !erroSync) {
    return (
      <div className="status-conexao status-online" title="Conectado ao servidor">
        ✓ Conectado
      </div>
    )
  }

  if (!online && !sincronizando) {
    return (
      <div className="status-conexao status-offline" title="Modo offline — dados salvos localmente">
        ⊚ Sem conexão
        {pendentes > 0 && <span className="badge-pendentes">{pendentes}</span>}
      </div>
    )
  }

  if (sincronizando) {
    return (
      <div className="status-conexao status-sincronizando" title="Sincronizando dados...">
        ⟳ Sincronizando...
        {pendentes > 0 && <span className="badge-pendentes">{pendentes}</span>}
      </div>
    )
  }

  if (erroSync) {
    return (
      <div className="status-conexao status-erro-sync" title={erroSync}>
        ✗ Erro na sincronização
        {pendentes > 0 && <span className="badge-pendentes">{pendentes}</span>}
      </div>
    )
  }

  return null
}
