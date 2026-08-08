import { useEffect, useState } from 'react'
import type { Perfil } from '../App'
import { supabase } from '../lib/supabase'

interface Props {
  perfil: Perfil | null
  email: string
  aoAtualizar: (perfil: Perfil) => void
}

export default function Config({ perfil, email, aoAtualizar }: Props) {
  const [nome, setNome] = useState('')
  const [profissao, setProfissao] = useState('')
  const [horario, setHorario] = useState('18:00')
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!perfil) return
    setNome(perfil.nome)
    setProfissao(perfil.profissao)
    setHorario(perfil.horario_relatorio.slice(0, 5))
  }, [perfil])

  async function salvar() {
    if (!perfil) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('perfil')
      .update({
        nome: nome.trim(),
        profissao: profissao.trim(),
        horario_relatorio: horario,
      })
      .eq('id', perfil.id)
      .select()
      .single()
    if (!error && data) {
      aoAtualizar(data as Perfil)
      setMensagem('Salvo ✓')
    } else {
      setMensagem('Não foi possível salvar. Tente de novo.')
    }
    setSalvando(false)
  }

  return (
    <div className="tela">
      <header className="cabecalho">
        <h1>Ajustes</h1>
        <p className="data-hoje">{email}</p>
      </header>

      <section className="cartao">
        <label className="campo">
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="campo">
          Profissão
          <input
            value={profissao}
            onChange={(e) => setProfissao(e.target.value)}
            placeholder="ex.: gestor comercial"
          />
        </label>
        <label className="campo">
          Horário do relatório de fim de dia
          <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
        </label>
        <p className="texto-suave">
          Depois desse horário, a página do dia sugere fechar o dia. O relatório também pode ser
          aberto a qualquer momento na aba Relatório.
        </p>
        {mensagem && <p className="mensagem-ok">{mensagem}</p>}
        <button className="botao-primario" disabled={salvando || !perfil} onClick={salvar}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </section>

      <section className="cartao">
        <button className="botao-secundario" onClick={() => supabase.auth.signOut()}>
          Sair da conta
        </button>
      </section>

      <p className="texto-suave versao">FOXDay — Fase 1 (MVP)</p>
    </div>
  )
}
