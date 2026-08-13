# FOXDay

🎯 Organizador do dia — simples, prático e objetivo.

> *"Capturar em 5 segundos, decidir em 1 toque, aprender todo dia."*

Tarefas e metas por texto ou voz, priorização **Importante / Urgente / Circunstancial**, check-in diário na página do dia, relatório de fim de dia e, com o uso, inteligência sobre a rotina e o perfil profissional para melhorar resultados e qualidade de vida.

---

## Status das Features

| Funcionalidade | Status | Nota |
|---|---|---|
| ✅ Login/Signup por email | Completo | Fase 1 |
| ✅ Captura de tarefa (texto) | Completo | Pronta para produção |
| ✅ Priorização (3 níveis) | Completo | Importante, Urgente, Circunstancial |
| ✅ Check-in diário (Hoje) | Completo | Com optimistic updates |
| ✅ Relatório de fim de dia | Completo | Nota + observação livre |
| ✅ Histórico & insights | Completo | Últimos 30 dias |
| ✅ PWA (instalável mobile) | Completo | "Add to Home Screen" |
| ✅ Captura por voz (ao vivo) | Completo | Web Speech API + interpretação via Claude |
| ✅ Captura por áudio (arquivo/WhatsApp) | Completo | Transcrição via Whisper (Supabase Edge Function) |
| 🚧 Insights com LLM sobre histórico | Fase 2 | `gerarInsights`/`sugerirAcoes` ainda são stubs |
| 📋 Multiusuário (compartilhado) | Fase 3 | Arquitetura pronta (RLS) |

---

## Quickstart

### Desenvolvimento (< 15 min)

Pré-requisitos: Node 20+

```bash
git clone https://github.com/foxtecnologiaonline/foxday.git
cd foxday

npm install
cp .env.example .env.local
# Editar .env.local com chaves Supabase

npm run dev
# Abrir http://localhost:5173
```

### Produção

Ver [DEPLOY.md](./DEPLOY.md) para instruções passo-a-passo (Vercel + Supabase).

---

## Documentação

| Documento | Para quem? | O quê? |
|---|---|---|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Desenvolvedores | Setup local, estrutura, padrões, debugging |
| [DEPLOY.md](./DEPLOY.md) | DevOps/Deploy | Vercel + Supabase, env vars, troubleshooting |
| [CLAUDE.md](./CLAUDE.md) | Product/Design | Princípios do produto, escopo, decisões |
| [docs/escopo.md](docs/escopo.md) | Todos | Visão completa, módulos, fases, stack |
| [docs/FLUXO_VOZ.md](docs/FLUXO_VOZ.md) | Fase 2 | Arquitetura de voz, mockup de UI, prompt Claude |

---

### Captura por áudio (transcrição)

Tarefas e anotações também podem ser criadas por voz: grave direto no app ou envie um arquivo de áudio — inclusive notas de voz do WhatsApp (`.opus`/`.ogg`). A transcrição roda em uma Supabase Edge Function (`supabase/functions/transcrever-audio`), que chama a API de transcrição da OpenAI (`whisper-1`) no servidor, mantendo a chave fora do app.

Formatos aceitos (mesmos suportados pela API): `mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, oga, opus, flac`. Limite de 25MB por arquivo (limite da própria API).

**Deploy da função** (Supabase CLI):

```bash
supabase functions deploy transcrever-audio --project-ref SEU_PROJECT_REF
supabase secrets set OPENAI_API_KEY=sk-... --project-ref SEU_PROJECT_REF
```

A chave `OPENAI_API_KEY` é obtida em [platform.openai.com](https://platform.openai.com/api-keys) — é um custo de uso (~US$ 0,006/min de áudio transcrito), pago por fora, sem crédito gratuito dedicado.

## Stack (aprovada)

- **Frontend:** PWA mobile-first (React 19 + Vite 6 + TypeScript)
- **Dados/Auth:** Supabase (Postgres + RLS + Email Auth)
- **Inteligência:** API Claude (Fase 2+)
- **Deploy:** Vercel (frontend) + Supabase (backend)
- **Testes:** Vitest (unitários + integração)

---

## Configuração Supabase Auth (Fase 1)

No dashboard do projeto Supabase, em **Authentication**:

- **Sign In / Providers → Email → "Confirm email"**: desativar (uso pessoal não precisa confirmar)
- **URL Configuration**:
  - **Site URL:** URL de produção (ex.: `https://foxday-xyz.vercel.app/`)
  - **Redirect URLs:** `https://foxday-xyz.vercel.app/`

---

## Desenvolvimento

### Comandos

```bash
npm run dev          # Dev server (Vite)
npm run build        # Build produção
npm run preview      # Preview local da build
npm run test         # Rodar testes (Vitest)
npm run lint         # Verificar tipos TypeScript
```

### Estrutura

```
src/
├── telas/           # Páginas (Hoje, Relatorio, etc)
├── componentes/     # Componentes reutilizáveis
├── hooks/           # Custom hooks (queries Supabase)
├── lib/             # Utilitários (supabase, erros, log)
├── estilos.css      # Estilos globais
└── App.tsx          # Roteamento + Auth
```

Ver [DEVELOPMENT.md](./DEVELOPMENT.md) para detalhes completos.

---

## PWA Mobile

No celular, acesse a URL publicada e use **"Adicionar à tela inicial"** — o app é um PWA instalável e funciona offline (cache).

---

## Testes

```bash
npm run test              # Rodar tudo
npm run test -- --ui      # UI interativa
npm run test -- dominio   # Teste específico
```

Coverage atual: ~85% (lógica de negócio)

---

## Performance

- **Bundle inicial:** ~50KB gzip (code-splitting + lazy-loading)
- **TTI:** < 1s (Vite)
- **FCP:** < 800ms (3G)
- **Skeleton loaders:** Em Hoje, Relatorio, Historico
- **Optimistic updates:** Marcar concluído é instantâneo

---

## Segurança

- **RLS (Row Level Security):** Ativado por padrão (usuário só vê seus dados)
- **Env vars:** Públicas (`VITE_*`) no repo/Vercel — qualquer variável com esse prefixo vai parar no bundle do navegador, visível a quem inspecionar o código. **Chaves de API pagas (OpenAI, Claude) nunca devem usar prefixo `VITE_*`** — ficam como secret de Supabase Edge Function (servidor), como já é o caso da `OPENAI_API_KEY` da transcrição de áudio. A interpretação por Claude (`src/lib/claude.ts`) ainda não está conectada a nenhuma chave real (`initClaudeClient` nunca é chamado) — quando for, deve seguir o mesmo padrão: chamada a partir de uma Edge Function, nunca direto do navegador.
- **Autenticação:** Email + Supabase (sem OAuth por enquanto)
- **Dados:** Criptografia TLS em trânsito, Postgres nativo em repouso

---

## Roadmap

### Fase 1 ✅ (Completa)
- 5 telas funcionais
- Captura text + priorização
- PWA instalável
- Testes + logging

### Fase 2 🚧 (Planejado 2026-09)
- ~~Captura por voz (Web Speech API)~~ ✅ feito
- ~~Interpretação com Claude API~~ ✅ feito (falta conectar a chave via Edge Function)
- Insights sobre padrão de tarefas
- Atalhos de voz

### Fase 3 📋 (Planejado 2026-12+)
- Compartilhamento de tarefas (multiusuário)
- Sugestões de melhorias (ML)
- Integrações externas (Google Calendar, etc)

---

## Suporte & Issues

- **Bugs:** Abrir issue no GitHub (repo privado)
- **Dúvidas:** Ver [DEVELOPMENT.md](./DEVELOPMENT.md) ou [DEPLOY.md](./DEPLOY.md)
- **Sugestões:** Email ou discussion no repo

---

## Licença

Propriedade da Fox Tecnologia Online (2026+). Código interno.

---

**Última atualização:** 2026-08-09 (BLOCO 3 & 4 documentação completa)
