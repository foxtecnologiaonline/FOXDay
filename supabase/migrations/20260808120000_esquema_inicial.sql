-- FOXDay — esquema inicial (Fase 1)
-- Todas as tabelas de usuário nascem com RLS por auth.uid().

-- ── Perfil ────────────────────────────────────────────────────────────────
create table public.perfil (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  profissao text not null default '',
  horario_relatorio time not null default '18:00',
  criado_em timestamptz not null default now()
);

alter table public.perfil enable row level security;

create policy "perfil: dono le" on public.perfil
  for select using (id = auth.uid());
create policy "perfil: dono atualiza" on public.perfil
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Perfil é criado automaticamente no signup, a partir dos metadados
-- (nome, profissao) enviados pelo app.
create or replace function public.criar_perfil_no_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfil (id, nome, profissao)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'profissao', '')
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_no_signup();

-- ── Meta (usada a partir da Fase 2; já no esquema conforme escopo) ────────
create table public.meta (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null,
  periodo text not null check (periodo in ('semana', 'mes')),
  status text not null default 'ativa' check (status in ('ativa', 'concluida', 'arquivada')),
  criado_em timestamptz not null default now()
);

alter table public.meta enable row level security;
create policy "meta: dono acessa" on public.meta
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ── Tarefa ────────────────────────────────────────────────────────────────
create table public.tarefa (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null,
  data date not null,
  classificacao text not null check (classificacao in ('importante', 'urgente', 'circunstancial')),
  status text not null default 'pendente' check (status in ('pendente', 'concluida', 'descartada')),
  meta_id uuid references public.meta (id) on delete set null,
  origem text not null default 'texto' check (origem in ('texto', 'voz')),
  criada_em timestamptz not null default now(),
  concluida_em timestamptz
);

create index tarefa_usuario_data on public.tarefa (usuario_id, data);
create index tarefa_usuario_status on public.tarefa (usuario_id, status);

alter table public.tarefa enable row level security;
create policy "tarefa: dono acessa" on public.tarefa
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ── Observação ────────────────────────────────────────────────────────────
create table public.observacao (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto text not null,
  data date not null,
  tarefa_id uuid references public.tarefa (id) on delete set null,
  origem text not null default 'texto' check (origem in ('texto', 'voz')),
  criado_em timestamptz not null default now()
);

create index observacao_usuario_data on public.observacao (usuario_id, data);

alter table public.observacao enable row level security;
create policy "observacao: dono acessa" on public.observacao
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ── Relatório do dia (fechamento) ─────────────────────────────────────────
create table public.relatorio_dia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data date not null,
  planejadas int not null default 0,
  concluidas int not null default 0,
  por_classificacao jsonb not null default '{}',
  nota int check (nota between 1 and 5),
  observacao text,
  criado_em timestamptz not null default now(),
  unique (usuario_id, data)
);

alter table public.relatorio_dia enable row level security;
create policy "relatorio: dono acessa" on public.relatorio_dia
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
