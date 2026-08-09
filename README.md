# FOXDay

Organizador do dia — simples, prático e objetivo.

> *"Capturar em 5 segundos, decidir em 1 toque, aprender todo dia."*

Tarefas e metas por texto ou voz, priorização **Importante / Urgente / Circunstancial**, check-in diário na página do dia, relatório de fim de dia e, com o uso, inteligência sobre a rotina e o perfil profissional para melhorar resultados e qualidade de vida.

## Documentação

- [Escopo do produto](docs/escopo.md) — visão, módulos, fases de entrega, stack e decisões.

## Como rodar

Pré-requisitos: Node 20+, um projeto Supabase com a migração de `supabase/migrations/` aplicada.

```bash
cp .env.example .env   # preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev            # desenvolvimento (http://localhost:5173)
npm test               # testes da lógica de domínio
npm run build          # build de produção em dist/
```

No celular, acesse a URL publicada e use "Adicionar à tela inicial" — o app é um PWA instalável.

### Configuração do Supabase Auth (uso pessoal, Fase 1)

No dashboard do projeto Supabase, em **Authentication**:

- **Sign In / Providers → Email → "Confirm email"**: desativar. Como a Fase 1 é uso pessoal (decisão 5 do escopo), a confirmação por e-mail é fricção desnecessária — login deve funcionar direto após o cadastro.
- **URL Configuration → Site URL**: definir para a URL de produção do app (ex.: a URL da Vercel), não `localhost`. Isso garante que qualquer link de e-mail (recuperação de senha, etc.) aponte para o lugar certo caso a confirmação seja reativada no futuro (fase multiusuário).

## Stack (aprovada)

- **Frontend:** PWA mobile-first (React + Vite)
- **Dados/Auth:** Supabase (Postgres + RLS)
- **Inteligência:** API Claude (fase 2+)
- **Deploy:** Vercel + Supabase

## Status

Escopo-base aprovado (2026-08-08). Próximo passo: backlog e setup da Fase 1 — ver [seção 14 do escopo](docs/escopo.md#14-próximos-passos).
