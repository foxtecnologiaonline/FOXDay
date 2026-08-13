-- FOXDay — Fase 2: Delegação e Rotina
-- Adiciona campos para controlar tarefas delegadas e tarefas rotineiras

-- ── Extensões necessárias ─────────────────────────────────────────────────
-- (já criadas na migração inicial, apenas confirmando)

-- ── Adicionar colunas à tabela tarefa ──────────────────────────────────────

-- Delegação
alter table public.tarefa add column delegada_para text;
alter table public.tarefa add column prazo_delegacao date;
alter table public.tarefa add column status_delegacao text default 'nao_delegada' check (
  status_delegacao in ('nao_delegada', 'delegada', 'cumprida', 'nao_cumprida')
);

-- Rotina
alter table public.tarefa add column eh_rotina boolean default false;
alter table public.tarefa add column dias_rotina jsonb default '[]';
alter table public.tarefa add column rotina_id uuid;

-- Foreign key para rotina_id (auto-referência para agrupar instâncias)
alter table public.tarefa
  add constraint tarefa_rotina_id_fk
  foreign key (rotina_id)
  references public.tarefa (id)
  on delete set null;

-- ── Índices para performance ──────────────────────────────────────────────
create index tarefa_delegada_para on public.tarefa (delegada_para);
create index tarefa_eh_rotina on public.tarefa (eh_rotina);
create index tarefa_rotina_id on public.tarefa (rotina_id);

-- ── Comentários para documentação ──────────────────────────────────────────
comment on column public.tarefa.delegada_para is 'Nome da pessoa para quem a tarefa foi delegada';
comment on column public.tarefa.prazo_delegacao is 'Data esperada para conclusão da tarefa delegada';
comment on column public.tarefa.status_delegacao is 'Status da delegação: nao_delegada, delegada, cumprida, nao_cumprida';
comment on column public.tarefa.eh_rotina is 'Se true, tarefa é rotineira e será repetida nos dias_rotina';
comment on column public.tarefa.dias_rotina is 'Array de dias da semana (0=seg, 1=ter, ..., 6=dom) em que rotina é ativa';
comment on column public.tarefa.rotina_id is 'UUID da tarefa "mãe" de rotina; null se for tarefa normal ou mãe de rotina';
