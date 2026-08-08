# FOXDay — instruções do projeto

Organizador do dia (produto próprio da Fox Tecnologia). Escopo completo e decisões em `docs/escopo.md` — leia antes de qualquer tarefa não-trivial.

## Contexto

- **Produto:** PWA mobile-first para organizar o dia — captura rápida de tarefas/metas (texto/voz), priorização Importante/Urgente/Circunstancial, check-in diário, relatório de fim de dia, inteligência sobre rotina e profissão (fases 2–3).
- **Stack aprovada:** React + Vite (PWA) · Supabase (Postgres + Auth + RLS) · API Claude para linguagem natural e insights (fase 2+) · deploy Vercel + Supabase.
- **Alcance:** usuário único no início; arquitetura multiusuário-ready (auth + RLS por usuário desde o dia 1).

## Princípios de produto (cortam features)

1. Criar tarefa nunca pode levar mais que ~5 segundos.
2. A tela inicial é sempre o dia de hoje.
3. No máximo uma decisão obrigatória por tarefa (a classificação).
4. A inteligência sugere; o usuário decide — nada automático sem confirmação.
5. LGPD por padrão: minimização, RLS, exportação/exclusão self-service.

## Convenções

- Idioma do produto, código de UI (textos) e commits: **português**. Commits no imperativo (`adiciona`, `ajusta`, `corrige`).
- Migrações de banco versionadas em `supabase/migrations/` — nunca alterar schema fora de migração.
- Toda tabela com dados de usuário nasce com política RLS; sem exceções.
- Nenhum segredo commitado (chaves Supabase/Claude via variáveis de ambiente).

## Linha vermelha (exige confirmação do usuário)

- Mudanças de escopo ou de stack em relação ao `docs/escopo.md`.
- Qualquer coisa que adicione fricção à captura de tarefas (princípio 1).
- Deploy em produção e criação/alteração de recursos pagos.
- Abertura do produto para outros usuários (hoje é pessoal).
