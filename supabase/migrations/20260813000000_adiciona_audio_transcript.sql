-- FOXDay — Fase 2a: Transcrição de Áudio
-- Adiciona tabela para armazenar metadados de áudios processados

-- ── Criar tabela audio_transcript ────────────────────────────────────────
create table public.audio_transcript (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  transcricao text not null,
  duracao_segundos integer not null,
  confianca integer not null check (confianca >= 0 and confianca <= 100),
  origem text not null check (origem in ('web-speech', 'audio-file')),
  tarefa_id uuid references public.tarefa(id) on delete set null,
  criado_em timestamp not null default now(),
  updated_at timestamp default now()
);

-- ── Índices para performance ──────────────────────────────────────────────
create index audio_transcript_usuario_id on public.audio_transcript(usuario_id);
create index audio_transcript_criado_em on public.audio_transcript(criado_em);
create index audio_transcript_tarefa_id on public.audio_transcript(tarefa_id);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.audio_transcript enable row level security;

create policy "Users can view their own audio transcripts" on public.audio_transcript
  for select using (usuario_id = auth.uid());

create policy "Users can insert their own audio transcripts" on public.audio_transcript
  for insert with check (usuario_id = auth.uid());

-- ── Comentários para documentação ────────────────────────────────────────
comment on table public.audio_transcript is 'Histórico de áudios processados (metadados: transcrição, duração, confiança; arquivo original não é armazenado)';
comment on column public.audio_transcript.transcricao is 'Texto transcrito via Whisper API ou Web Speech API';
comment on column public.audio_transcript.duracao_segundos is 'Duração do áudio em segundos';
comment on column public.audio_transcript.confianca is 'Nível de confiança da transcrição (0-100)';
comment on column public.audio_transcript.origem is 'Fonte do áudio: web-speech (browser) ou audio-file (upload)';
comment on column public.audio_transcript.tarefa_id is 'Referência para tarefa criada a partir deste áudio (null se não criou tarefa)';
