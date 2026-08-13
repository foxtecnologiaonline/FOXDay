# Escopo — FOXDay (organizador do dia)

> Status: **escopo-base aprovado pelo usuário em 2026-08-08** (decisões na seção 13).
> Próximo passo: backlog de implementação da Fase 1.

---

## 1. Visão

Uma ferramenta para organizar o dia de forma **simples, prática e objetiva**: o usuário digita (ou fala) tarefas e metas em segundos, classifica por importância, marca o que foi feito ao longo do dia e recebe um relatório ao final. Com o uso, a ferramenta aprende a rotina e o contexto profissional do usuário e passa a sugerir prioridades, balanceamento de agenda e boas práticas de gestão do tempo — melhorando resultados, performance e qualidade de vida.

**Frase-guia do produto:** *"Capturar em 5 segundos, decidir em 1 toque, aprender todo dia."*

## 2. Problema que resolve

| Dor | Como o produto responde |
|---|---|
| Ferramentas de produtividade são complexas demais; o usuário abandona | Captura ultrarrápida (texto/voz), zero configuração obrigatória |
| Falta de critério para priorizar → tudo vira "urgente" | Classificação guiada: **Importante / Urgente / Circunstancial** |
| Sem visão do que foi feito → sem aprendizado | Relatório automático de fim de dia + histórico |
| Rotina desalinhada com a profissão e os objetivos | Análise e balanceamento por perfil profissional (fase de inteligência) |
| Conhecimento de gestão do tempo fica em livros, não na prática | Micro-conteúdo contextual embutido no fluxo de uso |

## 3. Público-alvo

- **Início:** uso pessoal (usuário único — o dono do produto).
- **Evolução prevista:** abrir ao público (ex.: clientes da Fox). A arquitetura já nasce multiusuário-ready (auth + isolamento de dados por usuário), mas onboarding, planos e benchmarks agregados só entram quando a abertura for decidida.
- **Perfil profissional** é um dado de cadastro (ex.: gestor comercial, desenvolvedor, médico, advogado) — usado pela camada de inteligência para balancear a rotina conforme padrões típicos da profissão.

## 4. Princípios de produto (inegociáveis)

1. **Velocidade acima de completude** — adicionar uma tarefa nunca pode levar mais que alguns segundos.
2. **Um dia por vez** — a tela inicial é sempre o *hoje*; o resto é secundário.
3. **Classificação simples** — no máximo uma decisão por tarefa (importância), o resto é opcional ou inferido.
4. **A inteligência sugere, o usuário decide** — nenhuma ação automática sem confirmação.
5. **Privacidade por padrão** — dados de rotina são pessoais; LGPD desde o dia 1 (minimização, consentimento, exportação/exclusão).

## 5. Método de gestão embutido

O produto materializa um método, não só uma lista de tarefas:

- **Matriz de prioridade (adaptada de Eisenhower):**
  - **Importante** — move metas e resultados; deve dominar o dia.
  - **Urgente** — tem prazo/pressão; fazer ou delegar rápido.
  - **Circunstancial** — surgiu no contexto; fazer se sobrar espaço, ou descartar.
- **Metas vs. tarefas:** metas (semana/mês) puxam tarefas do dia; o relatório mostra se o dia serviu às metas.
- **Balanceamento de agenda:** proporção saudável entre Importante/Urgente/Circunstancial e entre blocos (trabalho profundo, reuniões, pessoal). A ferramenta mede e mostra o desvio.
- **Micro-conhecimento contextual:** pílulas curtas (30–60 palavras) sobre gestão do tempo, priorização e organização de agenda, exibidas no momento certo (ex.: dia com 80% de urgências → pílula sobre prevenção de urgências). Base de conteúdo própria, alinhada aos pilares da Fox (gestão de pessoas, financeira e marketing).

## 6. Funcionalidades por módulo

### M1 — Captura rápida
- Campo único "o que precisa ser feito?" com criação por **texto** ou **voz**.
- **Voz — implementado na Fase 1 (adiantado da Fase 2):** gravação ao vivo no app ou envio de arquivo de áudio em qualquer formato suportado pela API de transcrição (`mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, oga, opus, flac`), incluindo notas de voz do WhatsApp (`.opus`/`.ogg`). Transcrição via OpenAI `whisper-1` (Supabase Edge Function `transcrever-audio`); o texto transcrito fica editável antes de salvar — a transcrição sugere, o usuário confirma.
- Interpretação por linguagem natural (texto → data/hora/classificação automática): planejado para Fase 2.
- Criação em lote (colar várias linhas → várias tarefas).

### M2 — Classificação e planejamento
- Classificação em 1 toque: **Importante / Urgente / Circunstancial**.
- Atribuição por dia (hoje, amanhã, data específica) e ordenação dentro do dia.
- Metas de semana/mês vinculáveis às tarefas.

### M3 — Página inicial diária (check-in)
- Ao abrir, mostra **o dia de hoje**: principais itens ordenados por prioridade, prontos para marcar como feitos.
- Campo sempre visível para **observação ou novo comando** (texto ou voz): "concluí a proposta", "adiar reunião pra sexta", "me senti improdutivo à tarde".
- Itens não concluídos ontem aparecem para decisão rápida: reagendar / manter / descartar.

### M4 — Relatório de fim de dia
- **Horário configurável** pelo usuário (default 18h) **e geração sob demanda** a qualquer momento ("me mostra o relatório de hoje/da semana").
- Conteúdo: concluídas vs. planejadas, distribuição por importância, metas impactadas, observações do dia.
- Fechamento em 1 minuto: nota do dia (1–5) + observação livre opcional.
- Histórico semanal/mensal com tendências.

### M5 — Inteligência (rotina + profissão)
Evolução em 3 níveis — ver seção 8:
- **Sugestões de prioridade** com base no histórico (o que o usuário sempre conclui/adia, horários mais produtivos).
- **Balanceamento por profissão:** compara a rotina real com o padrão saudável do perfil profissional e sugere ajustes ("seus dias têm 70% de reuniões; para seu perfil, o recomendado é proteger 2h de trabalho profundo").
- **Detecção de padrões:** tarefas cronicamente adiadas, sobrecarga recorrente em dias específicos, metas sem progresso.

### M6 — Conhecimento e desenvolvimento
- Trilha leve de habilidades: gestão do tempo, prioridades (importante × urgente × circunstancial), organização de agenda, otimização do tempo.
- Entregue como pílulas contextuais (ver seção 5) + resumo semanal com 1 recomendação prática.

## 7. Fora de escopo (por enquanto)
- Colaboração multiusuário / delegação de tarefas para terceiros.
- Integração de calendário (Google/Outlook) — candidata forte para fase 2, mas fora do MVP.
- Gamificação complexa (pontos, rankings).
- App nativo nas lojas (o MVP é PWA instalável — ver seção 9).

## 8. Fases de entrega (priorização MoSCoW)

### Fase 1 — MVP funcional (sem ML) — *Must have*
Captura por texto, classificação I/U/C, página do dia com check, reagendamento de pendências, relatório de fim de dia (configurável + sob demanda), histórico simples, cadastro com profissão.
**Critério de sucesso:** usar todos os dias por 2 semanas sem fricção.

### Fase 2 — Assistente (LLM + regras) — *Should have*
Entrada por voz, interpretação por linguagem natural, relatório narrado com insights (via LLM, ex.: API Claude), pílulas de conhecimento contextuais, métricas de balanceamento com regras heurísticas por profissão.
> Honestidade técnica: nesta fase o "machine learning" é **LLM + heurísticas** — entrega valor imediato e coleta os dados que o ML real exige.

### Fase 3 — Personalização (ML sobre histórico) — *Could have*
Modelos sobre o histórico acumulado: previsão de conclusão, sugestão automática de prioridade, benchmarks por profissão agregados (anonimizados — depende da abertura ao público), recomendações de rotina personalizadas.
**Pré-requisito:** volume de dados das fases 1–2 (mínimo ~60–90 dias de uso real).

### Won't have (nesta versão)
Automação que age sem confirmação do usuário; venda/compartilhamento de dados de rotina.

## 9. Arquitetura e stack (aprovada)

- **Frontend:** PWA (instalável no celular, abre direto na página do dia) — React + Vite; interface mobile-first.
- **Backend/dados:** **Supabase** (Postgres + Auth + RLS) — RLS garante isolamento por usuário desde o dia 1, o que deixa o caminho multiusuário pronto sem retrabalho.
- **Voz:** Web Speech API no navegador (custo zero) com fallback para API de transcrição na fase 2.
- **Inteligência:** API Claude para interpretação de linguagem natural, relatórios narrados e insights (fase 2); ML próprio só na fase 3, quando houver dados.
- **Deploy:** Vercel (frontend) + Supabase (dados) — tiers gratuitos suficientes para o MVP.

### Modelo de dados inicial (rascunho)

| Entidade | Campos principais |
|---|---|
| `perfil` | usuário, profissão, horário do relatório, preferências |
| `meta` | título, período (semana/mês), status |
| `tarefa` | título, data, classificação (I/U/C), status, meta vinculada, origem (texto/voz), criada_em, concluída_em |
| `observacao` | texto, data/hora, origem (texto/voz), vínculo opcional a tarefa/dia |
| `relatorio_dia` | data, métricas do dia, nota (1–5), resumo gerado |

## 10. Requisitos não funcionais

- **Performance:** página do dia carrega < 1s; criar tarefa < 5s de ponta a ponta.
- **Disponibilidade offline:** leitura do dia e marcação de conclusão funcionam offline (sincroniza depois) — desejável no MVP, obrigatório na fase 2.
- **Segurança/LGPD:** autenticação, RLS por usuário, dados minimizados, exportação e exclusão de conta self-service, consentimento explícito para uso agregado/anonimizado (fase 3).
- **Acessibilidade:** uso confortável com uma mão; voz como alternativa real, não enfeite.

## 11. Métricas de sucesso

| Métrica | Alvo MVP |
|---|---|
| Dias de uso por semana (retenção) | ≥ 5/7 |
| Tempo médio para criar tarefa | ≤ 5s |
| Fechamentos de dia (relatório visto) | ≥ 60% dos dias ativos |
| % de tarefas Importantes concluídas | tendência de alta em 4 semanas |

## 12. Riscos e premissas

- **Risco — abandono por fricção:** mitigado pelos princípios 1 e 2; qualquer feature que atrase a captura é cortada.
- **Risco — "ML" prometido antes dos dados:** mitigado pelo faseamento honesto (seção 8); comunicação clara do que é regra, LLM ou modelo.
- **Risco — dados sensíveis de rotina:** tratados como dado pessoal desde o dia 1 (seção 10).
- **Premissa:** usuário único no MVP; arquitetura pronta para multiusuário (decisão 5).

## 13. Decisões tomadas (2026-08-08)

| # | Decisão | Resposta do usuário |
|---|---|---|
| 1 | Onde o produto vive | Repositório próprio: `foxtecnologiaonline/FOXDay` (este repo) |
| 2 | Stack | Aprovada: PWA + Supabase + API Claude + Vercel |
| 3 | Nome | **FOXDay** |
| 4 | Relatório de fim de dia | Horário **configurável** + geração **sob demanda** |
| 5 | Alcance | **Pessoal no início**, arquitetura aberta para oferecer ao público depois |

## 14. Próximos passos

1. Backlog de implementação da Fase 1 (épicos → histórias → tarefas técnicas).
2. Setup do projeto: Vite + React (PWA), projeto Supabase, migrações do modelo de dados com RLS.
3. Protótipo navegável da página do dia (M3) — é o coração do produto e valida os princípios 1 e 2 antes de construir o resto.
