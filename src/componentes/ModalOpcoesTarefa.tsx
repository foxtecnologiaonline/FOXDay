import { useState } from 'react'
import { Classificacao } from '../lib/dominio'
import '../estilos.css'

interface Props {
  aberto: boolean
  titulo: string
  classificacao: Classificacao
  data: 'hoje' | 'amanha'
  onCancelar: () => void
  onConfirmar: (dados: {
    titulo: string
    classificacao: Classificacao
    data: 'hoje' | 'amanha'
    ehRotina: boolean
    diasRotina: number[]
    ehDelegada: boolean
    delegadaPara: string | null
    prazoDelegacao: string | null
  }) => void
}

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

export default function ModalOpcoesTarefa({
  aberto,
  titulo,
  classificacao,
  data,
  onCancelar,
  onConfirmar,
}: Props) {
  const [ehRotina, setEhRotina] = useState(false)
  const [diasRotina, setDiasRotina] = useState<number[]>([])
  const [ehDelegada, setEhDelegada] = useState(false)
  const [delegadaPara, setDelegadaPara] = useState('')
  const [prazoDelegacao, setPrazoDelegacao] = useState('')

  if (!aberto) return null

  const toggleDia = (dia: number) => {
    setDiasRotina((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    )
  }

  const handleConfirmar = () => {
    onConfirmar({
      titulo,
      classificacao,
      data,
      ehRotina,
      diasRotina,
      ehDelegada,
      delegadaPara: ehDelegada ? delegadaPara || null : null,
      prazoDelegacao: ehDelegada ? prazoDelegacao || null : null,
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Opções avançadas</h2>
          <button className="modal-fechar" onClick={onCancelar}>✕</button>
        </div>

        <div className="modal-body">
          {/* Delegação */}
          <div className="opcoes-secao">
            <label className="opcoes-toggle">
              <input
                type="checkbox"
                checked={ehDelegada}
                onChange={(e) => setEhDelegada(e.target.checked)}
              />
              <span className="opcoes-titulo">👤 Delegar para alguém</span>
            </label>

            {ehDelegada && (
              <div className="opcoes-campos">
                <div className="modal-campo">
                  <label htmlFor="delegada-para" className="modal-label">
                    Delegar para
                  </label>
                  <input
                    id="delegada-para"
                    type="text"
                    className="modal-input"
                    placeholder="Nome da pessoa"
                    value={delegadaPara}
                    onChange={(e) => setDelegadaPara(e.target.value)}
                  />
                </div>

                <div className="modal-campo">
                  <label htmlFor="prazo-delegacao" className="modal-label">
                    Prazo esperado
                  </label>
                  <input
                    id="prazo-delegacao"
                    type="date"
                    className="modal-input"
                    value={prazoDelegacao}
                    onChange={(e) => setPrazoDelegacao(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rotina */}
          <div className="opcoes-secao">
            <label className="opcoes-toggle">
              <input
                type="checkbox"
                checked={ehRotina}
                onChange={(e) => setEhRotina(e.target.checked)}
              />
              <span className="opcoes-titulo">🔄 Configurar como rotina</span>
            </label>

            {ehRotina && (
              <div className="opcoes-campos">
                <p className="modal-label">Repetir nos dias:</p>
                <div className="opcoes-dias">
                  {DIAS_SEMANA.map((dia, idx) => (
                    <button
                      key={idx}
                      className={`opcoes-dia ${diasRotina.includes(idx) ? 'ativo' : ''}`}
                      onClick={() => toggleDia(idx)}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
                {diasRotina.length === 0 && ehRotina && (
                  <p className="modal-aviso" style={{ marginTop: '8px' }}>
                    ⚠️ Selecione pelo menos um dia da semana
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-acoes">
          <button className="botao-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className="botao-primario"
            onClick={handleConfirmar}
            disabled={ehRotina && diasRotina.length === 0}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
