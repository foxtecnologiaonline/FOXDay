# FOXDay — Guia de Desenvolvimento

Documento para desenvolvedores que querem contribuir ou fazer setup local do projeto.

---

## Quickstart (< 15 min)

```bash
# 1. Clonar repositório
git clone https://github.com/foxtecnologiaonline/foxday
cd foxday

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas chaves Supabase

# 4. Iniciar servidor dev
npm run dev
# Abrir http://localhost:5173 no navegador
```

---

## Estrutura de Pastas

```
foxday/
├── src/
│   ├── telas/                 # Componentes de página (full-screen)
│   │   ├── Entrar.tsx         # Login/signup
│   │   ├── Hoje.tsx           # Tela principal (captura + lista)
│   │   ├── Relatorio.tsx      # Fechamento do dia
│   │   ├── Historico.tsx      # Histórico de dias anteriores
│   │   └── Config.tsx         # Configurações do usuário
│   │
│   ├── componentes/           # Componentes reutilizáveis
│   │   ├── SkeletonTarefa.tsx
│   │   ├── SkeletonCard.tsx
│   │   └── ComponenteErro.tsx # Error Boundary
│   │
│   ├── lib/
│   │   ├── supabase.ts        # Cliente Supabase + supabaseCall() wrapper
│   │   ├── erros.ts           # Tipagem e classificação de erros
│   │   ├── log.ts             # Logger estruturado (dev + LocalStorage)
│   │   ├── dominio.ts         # Tipos (Tarefa, Classificacao) + lógica
│   │   ├── datas.ts           # Utilitários de data (hojeISO, adicionarDias, etc)
│   │   └── claude.ts          # Wrapper para API Claude (Fase 2, stub)
│   │
│   ├── hooks/                 # Custom hooks (preparação Fase 2)
│   │   ├── useTarefasHoje.ts
│   │   ├── useRelatorioData.ts
│   │   └── useAtrasadas.ts
│   │
│   ├── estilos.css            # Estilos globais (variables, componentes)
│   ├── App.tsx                # Roteamento + ErrorBoundary + Auth
│   └── main.tsx               # Entry point React
│
├── supabase/
│   ├── migrations/            # Migrações SQL versionadas
│   │   ├── 20250101000000_tabelas_base.sql
│   │   ├── 20250102000000_rls_policies.sql
│   │   └── ...
│   └── config.toml            # Config Supabase local
│
├── src/__tests__/
│   ├── dominio.test.ts        # Testes unitários (lógica de negócio)
│   └── supabase.integration.test.ts
│
├── .env.example               # Template de env vars
├── .env.local                 # ← Criado localmente (não commitado)
├── vite.config.ts             # Config build + lazy-loading
├── tsconfig.json              # Strict TypeScript
├── DEVELOPMENT.md             # Este arquivo
├── DEPLOY.md                  # Guia de deployment
└── README.md                  # Documentação geral do produto
```

---

## Comandos Úteis

### Desenvolvimento
```bash
npm run dev          # Iniciar Vite dev server (http://localhost:5173)
npm run build        # Build para produção (dist/)
npm run preview      # Preview local da build de produção
npm run test         # Rodar testes com Vitest
npm run lint         # Verificar tipos TypeScript (sem compilar)
```

### Debugging
```bash
# Inspecionar logs salvos em localStorage
# No console do navegador:
log.obterLogs()      # Ver todos os logs
log.exportarLogs()   # Fazer download JSON com histórico
log.limparLogs()     # Limpar histórico local
```

### Supabase Local
```bash
npm install -g supabase  # Se ainda não tiver
supabase start          # Inicia Postgres + API local
supabase stop           # Para servidor
supabase push           # Aplica migrações locais
```

---

## Padrões de Código

### Naming Conventions

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componentes React | PascalCase | `Hoje.tsx`, `SkeletonTarefa.tsx` |
| Arquivos lib/hooks | camelCase | `supabase.ts`, `useTarefasHoje.ts` |
| CSS classes | kebab-case | `.item-tarefa`, `.botao-primario` |
| Types/Interfaces | PascalCase | `Tarefa`, `Observacao`, `Classificacao` |
| Constantes | UPPER_CASE | `CLASSIFICACOES`, `ROTULO_CLASSIFICACAO` |
| Variáveis/funções | camelCase | `hojeISO()`, `adicionarDias()` |

### Commits

Escrever **em português**, modo imperativo (ação clara):

```bash
# ✓ Bom
git commit -m "adiciona validação de email no login"
git commit -m "corrige bug ao marcar tarefa concluída"
git commit -m "otimiza bundle com code-splitting"

# ✗ Ruim
git commit -m "fixed bug"
git commit -m "WIP: trying something"
git commit -m "changes to supabase.ts"
```

### Tratamento de Erros

**Sempre usar `supabaseCall()`** para operações Supabase:

```typescript
import { supabaseCall } from '../lib/supabase'
import { logErro } from '../lib/log'

// ✓ Correto
async function salvarTarefa(titulo: string) {
  const { data, erro } = await supabaseCall(async () => {
    return supabase.from('tarefa').insert({ titulo })
  })
  
  if (erro) {
    logErro('Erro ao salvar tarefa', erro)
    setMensagem('Não foi possível salvar. Tente de novo.')
    return
  }
  
  // Sucesso
  setMensagem('Tarefa salva!')
}

// ✗ Evitar (sem retry, sem logging consistente)
const { data, error } = await supabase.from('tarefa').insert({ titulo })
```

Retorno do `supabaseCall()`:
```typescript
{ 
  data: T | null,
  erro?: ErroFoxDay  // undefined se sucesso
}
```

**ErroFoxDay** tem campos:
- `tipo`: 'rede' | 'autenticacao' | 'validacao' | 'permissao' | 'banco_dados' | 'desconhecido'
- `mensagem`: string (mensagem técnica)
- `tentativa`: number (número da tentativa se retry)

**Retry automático** acontece para falhas de rede. Não fazer retry manual.

### State Management

- **useState** para estado local do componente
- **useCallback** com dependências explícitas (sempre)
- **useEffect** com array de dependências (nunca deixar vazio sem motivo)
- **Sem Redux/Zustand** (manter simplicidade)
- **Context** apenas se necessário (ex.: perfil do usuário, tema)

Exemplo correto:

```typescript
export default function Hoje() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // ✓ Dependencies explícitas
  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabaseCall(...)
    setTarefas(data ?? [])
    setCarregando(false)
  }, []) // Vazio OK: não depende de nada externo
  
  // ✓ Effect com dependências
  useEffect(() => {
    carregar()
  }, [carregar])
  
  return <div>...</div>
}
```

### Queries & Mutations

Padrão para buscar dados:

```typescript
const carregar = useCallback(async () => {
  setCarregando(true)
  const { data, erro } = await supabaseCall(async () => {
    return supabase
      .from('tarefa')
      .select('*')
      .eq('data', hojeISO())
      .order('criada_em')
  })
  setTarefas((data as Tarefa[]) ?? [])
  if (erro) logErro('Erro ao carregar tarefas', erro)
  setCarregando(false)
}, [])

useEffect(() => { carregar() }, [carregar])
```

Padrão para mutações com **optimistic update**:

```typescript
async function marcarConcluida(id: string) {
  // 1. Atualizar local imediatamente (otimistic)
  const tarefaAnterior = tarefas.find(t => t.id === id)
  setTarefas(prev =>
    prev.map(t => t.id === id ? {...t, status: 'concluida'} : t)
  )
  
  // 2. Confirmar no servidor (async)
  const { erro } = await supabaseCall(async () => {
    return supabase.from('tarefa')
      .update({ status: 'concluida', concluida_em: new Date().toISOString() })
      .eq('id', id)
  })
  
  // 3. Se erro: reverter
  if (erro) {
    setTarefas(prev =>
      prev.map(t => t.id === id ? tarefaAnterior! : t)
    )
    logErro('Erro ao marcar concluída', erro)
  }
}
```

### CSS & Estilo

- Mobile-first responsive (começar com mobile, adicionar media queries)
- CSS variables para tema: `--laranja`, `--fundo`, `--texto`, etc
- Sem Tailwind/Bootstrap (flexbox + grid puro)
- Animações simples (shimmer para skeleton, transition para hover)
- Max-width: 520px (mobile + desktop pequeno)

Exemplo:

```css
/* ✓ Bom: variáveis + mobile-first */
.botao-primario {
  background: var(--laranja);
  color: #fff;
  padding: 12px 18px;
  border-radius: 12px;
  font-weight: 600;
  width: 100%;  /* Mobile first */
}

.botao-primario:hover {
  opacity: 0.9;
}

@media (min-width: 768px) {
  .botao-primario {
    width: auto;  /* Desktop: width natural */
  }
}

/* ✗ Ruim: cores hardcoded, media query first */
.botao-primario {
  background: #e8590c;
  width: auto;
}

@media (max-width: 767px) {
  .botao-primario { width: 100%; }
}
```

---

## Fluxo de Dados

```
Usuário digita/clica
    ↓
Event handler (onChange, onClick)
    ↓
State update (setState)
    ↓
Render (JSX atualiza)
    ↓
Se precisa dados:
  ├─ Optimistic update (se mutation)
  └─ supabaseCall() → Supabase
      ├─ RLS policy check (por user_id)
      └─ Database query
          ↓
        Erro? Rollback local state
        Sucesso? Confirmar update
```

**Exemplo: Marcar tarefa concluída**

```
Usuário clica checkbox
  ↓
alternarConclusao(tarefaId)
  ├─ Optimistic: setTarefas({ status: 'concluida' })
  ├─ Async: UPDATE tarefa WHERE id = ? AND usuario_id = ?
  └─ Se erro: rollback
```

---

## Debugging

### Console Logs

Usar `log()` em vez de `console.log()`:

```typescript
import { log, logErro, logAviso } from '../lib/log'

log('Tarefa salva', { id, titulo })      // info
logAviso('Baixa confiança na voz', 45)   // warning
logErro('Falha ao salvar', erro)         // error
```

Recuperar logs:

```javascript
// No console do navegador:
log.obterLogs()                    // Array<LogEntry>
log.obterLogs('erro')              // Filtrar por nível
log.exportarLogs()                 // Download JSON
```

### DevTools Network

1. Abrir DevTools (F12) → Network tab
2. Filtrar por "API" ou digitar "supabase"
3. Ver request/response de operações Supabase
4. Status codes: 200 OK, 400 validation, 401 auth, 403 RLS, 500 server

### Offline Mode

Simular offline (para testar rollback):

1. DevTools → Network
2. Throttling: "Offline"
3. Tentar ação (ex.: marcar tarefa)
4. Verificar rollback automático após timeout

### Error Boundary

Se component crasha, Error Boundary em App.tsx captura:

```
[App] → ErrorBoundary
  └─ Content
      └─ Hoje (se crashar aqui, ErrorBoundary mostra fallback)
```

Ver erro no console + localStorage logs.

---

## Supabase Local (Desenvolvimento)

Setup:

```bash
# Instalar CLI
npm install -g supabase

# Iniciar servidor local
supabase start
# Output:
#   API URL: http://localhost:54321
#   Anon Key: eyJhbGciOiJIUzI1NiIs...
#   Service Role Key: eyJhbGciOiJIUzI1NiIs...

# Atualizar .env.local:
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<chave acima>
```

Executar migrações locais:

```bash
supabase push  # Aplica migrations/ ao banco local
```

Acessar dashboard local: http://localhost:54323

---

## Testing

Rodar testes:

```bash
npm run test           # Rodar tudo
npm run test -- --ui   # Abrir UI interativa
npm run test -- src/lib/dominio  # Testar arquivo específico
```

Padrão de testes:

```typescript
import { describe, it, expect } from 'vitest'

describe('calcularResumo', () => {
  it('retorna 0% quando nenhuma tarefa concluída', () => {
    const tarefas: Tarefa[] = [
      { id: '1', titulo: 'T1', status: 'pendente', ... }
    ]
    const resumo = calcularResumo(tarefas)
    expect(resumo.percentual).toBe(0)
  })
  
  it('retorna 50% com 1 de 2 concluídas', () => {
    const tarefas: Tarefa[] = [
      { id: '1', titulo: 'T1', status: 'pendente', ... },
      { id: '2', titulo: 'T2', status: 'concluida', ... }
    ]
    const resumo = calcularResumo(tarefas)
    expect(resumo.percentual).toBe(50)
  })
})
```

Usar `vitest.mock()` para Supabase em testes integração.

---

## Segurança

### RLS (Row Level Security)

**Todo INSERT/UPDATE/DELETE** é verificado contra RLS policy:

```sql
-- Exemplo: usuário só vê suas próprias tarefas
CREATE POLICY "Users can only access their own tasks"
ON tarefa
FOR ALL
USING (auth.uid() = usuario_id)
```

✓ Automático: se usuário não for o dono, Supabase rejeita.

### Env Vars

**Nunca** commitar `.env.local` ou secrets:

```bash
# .env.local (local only)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# ✓ Público (pode commitar)
VITE_* = visible ao browser, safe para URLs/keys públicas

# ✓ Privado (Vercel secret vars)
API_CLAUDE_KEY = nunca em .env.local, sempre em Vercel settings
```

---

## Troubleshooting

### "Module not found: '@supabase/supabase-js'"

```bash
npm install  # Reinstalar dependências
```

### "TypeError: supabase is not defined"

- Verificar import: `import { supabase } from '../lib/supabase'`
- Certificar que arquivo está em `src/lib/supabase.ts`

### "RLS policy prevents INSERT"

- Verificar que `usuario_id` está sendo enviado
- Confirmar que usuário está autenticado (auth.uid() válido)
- Ver logs Supabase: dashboard → Logs

### "Build size muito grande"

```bash
npm run build
du dist/  # Ver tamanho dos chunks
```

Se > 100KB gzip:
- Usar React DevTools Profiler
- Verificar se telas estão sendo lazy-loaded
- Remover imports não usados

### "Tests falhando com mocks"

- Certificar que `vitest.mock()` está antes dos imports
- Usar `import.meta.glob` se necessário dinamicamente
- Ver exemplo em `src/__tests__/supabase.integration.test.ts`

---

## Próximas Etapas

- Ler [DEPLOY.md](./DEPLOY.md) para setup de produção
- Ler [CLAUDE.md](./CLAUDE.md) para principles do produto
- Explorar `docs/` para detalhes de Fase 2 (voz, LLM)
