import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Entrar() {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [nome, setNome] = useState('')
  const [profissao, setProfissao] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setAviso('')
    setOcupado(true)
    try {
      if (modo === 'cadastrar') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome: nome.trim(), profissao: profissao.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        if (!data.session) {
          setAviso('Cadastro criado! Confirme seu e-mail para entrar.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
      }
    } catch (excecao) {
      const mensagem = excecao instanceof Error ? excecao.message : 'Algo deu errado. Tente de novo.'
      setErro(
        mensagem.includes('Invalid login credentials')
          ? 'E-mail ou senha incorretos.'
          : mensagem
      )
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="tela-central">
      <h1 className="logo">FOXDay</h1>
      <p className="slogan">Capturar em 5 segundos, decidir em 1 toque, aprender todo dia.</p>

      <form className="formulario" onSubmit={enviar}>
        {modo === 'cadastrar' && (
          <>
            <input
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
            <input
              placeholder="Sua profissão (ex.: gestor comercial)"
              value={profissao}
              onChange={(e) => setProfissao(e.target.value)}
              required
            />
          </>
        )}
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={8}
          required
        />

        {erro && <p className="mensagem-erro">{erro}</p>}
        {aviso && <p className="mensagem-ok">{aviso}</p>}

        <button className="botao-primario" disabled={ocupado}>
          {ocupado ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <button
        className="botao-link"
        onClick={() => {
          setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
          setErro('')
          setAviso('')
        }}
      >
        {modo === 'entrar' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
      </button>
    </div>
  )
}
