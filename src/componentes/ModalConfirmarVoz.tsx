import { Classificacao, ROTULO_CLASSIFICACAO } from '../lib/dominio'
import '../estilos.css'

interface Props {
  tarefa: string
  classificacao: Classificacao
  data: 'hoje' | 'amanha'
  confianca: number
  processando?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export default function ModalConfirmarVoz({
  tarefa,
  classificacao,
  data,
  confianca,
  processando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const dataLabel = data === 'hoje' ? 'Hoje' : 'Amanhã'
  const confiancaLabel = confianca >= 80 ? 'Alto' : confianca >= 60 ? 'Médio' : 'Baixo'
  const confiancaColor = confianca >= 80 ? '#27ae60' : confianca >= 60 ? '#f39c12' : '#e74c3c'

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmar tarefa</h2>
          <button className="modal-fechar" onClick={onCancelar}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-item">
            <span className="modal-icone">📝</span>
            <div>
              <p className="modal-label">Tarefa</p>
              <p className="modal-valor">{tarefa}</p>
            </div>
          </div>

          <div className="modal-item">
            <span className="modal-icone">📅</span>
            <div>
              <p className="modal-label">Data</p>
              <p className="modal-valor">{dataLabel}</p>
            </div>
          </div>

          <div className="modal-item">
            <span className="modal-icone">🏷️</span>
            <div>
              <p className="modal-label">Importância</p>
              <p className="modal-valor">{ROTULO_CLASSIFICACAO[classificacao]}</p>
            </div>
          </div>

          <div className="modal-item">
            <span className="modal-icone">🎯</span>
            <div>
              <p className="modal-label">Confiança</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '60px',
                  height: '6px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${confianca}%`,
                    height: '100%',
                    backgroundColor: confiancaColor,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <span style={{ fontSize: '14px', color: confiancaColor, fontWeight: '600' }}>
                  {confianca}% ({confiancaLabel})
                </span>
              </div>
            </div>
          </div>

          {confianca < 70 && (
            <div className="modal-aviso">
              <p>⚠️ Confiança baixa. Verifique se está tudo certo antes de confirmar.</p>
            </div>
          )}
        </div>

        <div className="modal-acoes">
          <button
            className="botao-secundario"
            onClick={onCancelar}
            disabled={processando}
          >
            Cancelar
          </button>
          <button
            className="botao-primario"
            onClick={onConfirmar}
            disabled={processando}
          >
            {processando ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
