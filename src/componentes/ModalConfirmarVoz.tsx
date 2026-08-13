import { useState } from 'react'
import { Classificacao, ROTULO_CLASSIFICACAO, CLASSIFICACOES } from '../lib/dominio'
import '../estilos.css'

interface Props {
  tarefa: string
  classificacao: Classificacao
  data: 'hoje' | 'amanha'
  confianca: number
  processando?: boolean
  onConfirmar: (tarefa: string, classificacao: Classificacao, data: 'hoje' | 'amanha') => void
  onCancelar: () => void
}

export default function ModalConfirmarVoz({
  tarefa: tarefaInicial,
  classificacao: classificacaoInicial,
  data: dataInicial,
  confianca,
  processando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const [tarefa, setTarefa] = useState(tarefaInicial)
  const [classificacao, setClassificacao] = useState(classificacaoInicial)
  const [data, setData] = useState(dataInicial)
  const [editando, setEditando] = useState(confianca < 70)

  const dataLabel = data === 'hoje' ? 'Hoje' : 'Amanhã'
  const confiancaLabel = confianca >= 80 ? 'Alto' : confianca >= 60 ? 'Médio' : 'Baixo'
  const confiancaColor = confianca >= 80 ? '#27ae60' : confianca >= 60 ? '#f39c12' : '#e74c3c'

  if (editando) {
    return (
      <div className="modal-overlay" onClick={onCancelar}>
        <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Editar tarefa</h2>
            <button className="modal-fechar" onClick={onCancelar}>✕</button>
          </div>

          <div className="modal-body">
            <div className="modal-campo">
              <label htmlFor="tarefa-input" className="modal-label">Tarefa</label>
              <input
                id="tarefa-input"
                type="text"
                className="modal-input"
                value={tarefa}
                onChange={(e) => setTarefa(e.target.value)}
                placeholder="Descrição da tarefa"
              />
            </div>

            <div className="modal-campo">
              <label htmlFor="data-select" className="modal-label">Data</label>
              <select
                id="data-select"
                className="modal-input"
                value={data}
                onChange={(e) => setData(e.target.value as 'hoje' | 'amanha')}
              >
                <option value="hoje">Hoje</option>
                <option value="amanha">Amanhã</option>
              </select>
            </div>

            <div className="modal-campo">
              <label className="modal-label">Importância</label>
              <div className="modal-classificacoes">
                {CLASSIFICACOES.map((c) => (
                  <button
                    key={c}
                    className={`botao-classificacao ${c} ${classificacao === c ? 'ativo' : ''}`}
                    onClick={() => setClassificacao(c)}
                  >
                    {ROTULO_CLASSIFICACAO[c]}
                  </button>
                ))}
              </div>
            </div>

            {confianca < 70 && (
              <div className="modal-aviso">
                <p>⚠️ Confiança da interpretação é baixa. Revise os dados antes de confirmar.</p>
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
              onClick={() => onConfirmar(tarefa, classificacao, data)}
              disabled={processando || !tarefa.trim()}
            >
              {processando ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

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
              <p>⚠️ Confiança baixa. Clique em "Editar" para revisar os dados.</p>
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
          {confianca < 70 && (
            <button
              className="botao-secundario"
              onClick={() => setEditando(true)}
              disabled={processando}
            >
              ✎ Editar
            </button>
          )}
          <button
            className="botao-primario"
            onClick={() => onConfirmar(tarefa, classificacao, data)}
            disabled={processando}
          >
            {processando ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
