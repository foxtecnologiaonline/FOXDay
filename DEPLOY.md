# FOXDay — Guia de Deployment

Instruções para deploy em produção (Vercel + Supabase).

---

## Visão Geral

- **Frontend:** Vercel (deploy automático)
- **Backend:** Supabase Cloud (gerenciado)
- **Branch production:** `main`
- **Branch staging:** `develop` (opcional)
- **Autenticação:** Email + Supabase Auth
- **Database:** Postgres (Supabase)

---

## Pré-requisitos

- [Vercel account](https://vercel.com/signup) (free tier ok)
- [Supabase account](https://supabase.com/dashboard) (free tier 500MB)
- Git configurado localmente
- Node.js 18+

---

## Setup Local (Supabase Local)

Antes de fazer deploy, testar tudo localmente:

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
# ou
brew install supabase/tap/supabase  # macOS
```

### 2. Iniciar Supabase local

```bash
cd foxday
supabase start
```

Output:
```
     API URL: http://localhost:54321
     DB URL: postgresql://...
     Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     S3 Storage URL: http://localhost:54321/storage/v1/s3
```

### 3. Atualizar .env.local

```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<Anon Key acima>
```

### 4. Rodar app localmente

```bash
npm install
npm run dev
# Abrir http://localhost:5173
```

### 5. Testar fluxo completo

- Criar conta (email teste + password)
- Criar algumas tarefas
- Marcar concluído
- Testar relatório
- Verificar que dados salvaram

Se tudo funcionar localmente, pronto para deploy.

---

## Deploy Vercel (Frontend)

### 1. Conectar Repositório

1. Ir para [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique "New Project"
3. Selecione repositório GitHub `foxtecnologiaonline/foxday`
4. Vercel auto-detecta: Framework = Vite

### 2. Configurar Build & Env Vars

Framework settings:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Environment variables (copiar de .env.local):

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave anônima Supabase production>
```

**Onde pegar essas chaves?** → Supabase Dashboard → Settings → API

### 3. Deploy

Clique "Deploy". Vercel:
1. Clona repo
2. Roda `npm install`
3. Roda `npm run build`
4. Upload de `dist/` para CDN
5. Gera URL: `https://foxday-<random>.vercel.app`

Após deploy, sempre que fazer push para `main`, Vercel redeploy automático.

---

## Deploy Supabase (Backend)

### 1. Criar Projeto Supabase

1. Ir para [supabase.com/dashboard](https://supabase.com/dashboard)
2. "New project"
3. Selecionar organização
4. Nome: "FOXDay Production"
5. Região: São Paulo ou mais próxima (menor latência)
6. Database password: gerar forte (salvar em lugar seguro!)
7. Criar projeto (esperar ~2-3 min)

### 2. Configurar Email Auth

Settings → Authentication:

```
Email (built-in)
├─ Enable email signup: ON
├─ Confirm email: OFF (para teste rápido) ou ON (produção)
└─ Session expiry: 30 days
```

Habilitar redirect URLs:

```
Auth → URL Configuration
├─ Site URL: https://foxday-<random>.vercel.app/
├─ Redirect URLs: https://foxday-<random>.vercel.app/
└─ Add: https://foxday-<random>.vercel.app/entrar
```

### 3. Copiar API Keys

Settings → API:

```
Project URL: https://<project-id>.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiI...  ← copiar para Vercel
Service Role Key: eyJhbGciOi...   ← guardar seguro (não usar em frontend)
```

### 4. Aplicar Migrations

Conectar projeto Supabase ao repositório local:

```bash
supabase link --project-ref <project-id>
# Pedir password do banco (salvo durante criação)

supabase db push
# Aplica todas as migrations/ ao banco production
```

Verificar migrations aplicadas:

```
Supabase Dashboard → SQL Editor
```

Deve haver tabelas: `usuario`, `tarefa`, `observacao`, `relatorio_dia`

### 5. Verificar RLS Policies

```
Supabase Dashboard → Authentication → Policies
```

Cada tabela deve ter:
- Policy `"Users can read own data"` (SELECT)
- Policy `"Users can create own data"` (INSERT)
- Policy `"Users can update own data"` (UPDATE)
- Policy `"Users can delete own data"` (DELETE)

Se faltarem, rodar migration:

```bash
supabase db push --dry-run  # Ver o que vai aplicar
supabase db push            # Aplicar
```

---

## Configuração Vercel + Supabase

### 1. Atualizar Env Vars Vercel

Vercel Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key production>
VITE_CLAUDE_API_KEY=sk-ant-...  (opcional, Fase 2)
```

### 2. Testar Integração

1. Fazer push para `main`
2. Vercel redeploy automático (esperar ~2 min)
3. Abrir https://foxday-<random>.vercel.app
4. Criar conta com email teste
5. Verificar email recebido (se confirm email ativado)
6. Criar tarefa → verificar se salvou em Supabase
7. DevTools → Network → filtrar "supabase" → verificar requests

### 3. Verificação Pós-Deploy

Checklist:

- [ ] Login funciona (email + password)
- [ ] Criar tarefa → salva no banco
- [ ] Marcar concluído → optimistic update + salva
- [ ] Navegar entre telas → lazy-loading funciona
- [ ] Relatório → calcula resumo
- [ ] Histórico → mostra dias anteriores
- [ ] DevTools → Console sem erros críticos
- [ ] DevTools → Network → sem 5xx errors
- [ ] Mobile responsivo (DevTools mobile emulation)

---

## Monitoramento

### Vercel Analytics

```
Vercel Dashboard → [Project] → Analytics
```

Métricas:

- **Requests:** Quantidade de requisições
- **Bandwidth:** Dados transferidos
- **Build time:** Tempo de build
- **Performance:** Web Vitals (LCP, FID, CLS)

Alerta: Se Bandwidth > 10GB/mês, analisar. Cacheing pode precisar ajuste.

### Supabase Logs

```
Supabase Dashboard → Logs
```

Ver:
- **Edge Functions logs:** (se usar Fase 2)
- **Database logs:** Queries lentas, errors
- **Auth logs:** Logins, signups

Alerta: Se muitos 403 errors, verificar RLS policies.

### Error Tracking

Implementar em App.tsx (Fase 2):

```typescript
// Opcional: integrar com Sentry ou Rollbar
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_ENV || 'production',
})
```

---

## Troubleshooting

### "Erro de autenticação após deploy"

**Sintoma:** Login funciona local, mas falha em produção.

**Checklist:**

1. Verificar Supabase Auth Redirect URLs:
   ```
   Supabase Dashboard → Auth → URL Configuration
   Site URL: https://foxday-<random>.vercel.app/
   Redirect URLs: https://foxday-<random>.vercel.app/
   ```

2. Verificar env vars Vercel:
   ```
   VITE_SUPABASE_URL=https://<project-id>.supabase.co  (sem /auth/v1)
   VITE_SUPABASE_ANON_KEY=<chave correta>
   ```

3. Limpar cache browser:
   ```
   DevTools → Application → Storage → Clear All
   ```

4. Verificar logs Supabase:
   ```
   Supabase Dashboard → Logs → Auth events
   ```

### "Tarefa não salva (erro 403)"

**Sintoma:** Criar tarefa funciona local, mas erro 403 em produção.

**Causa:** RLS policy negando acesso.

**Fix:**

1. Verificar que usuario_id é enviado:
   ```
   DevTools → Network → POST /tarefa → check request body
   ```

2. Verificar que usuário está autenticado:
   ```javascript
   // No console:
   supabase.auth.getSession()  // Deve ter session.user.id
   ```

3. Verificar RLS policy:
   ```
   Supabase Dashboard → Authentication → Policies → Tabela tarefa
   
   Deve ter:
   CREATE POLICY "Users can insert own tasks"
   ON tarefa
   FOR INSERT
   WITH CHECK (auth.uid() = usuario_id)
   ```

4. Se tudo parece correto, rodar debug:
   ```bash
   supabase db push --dry-run
   # Ver se há migrações não aplicadas
   ```

### "Bundle grande, slow cold start"

**Sintoma:** TTI > 3s mesmo com lazy-loading.

**Checklist:**

1. Verificar tamanho dos chunks:
   ```bash
   npm run build
   du -sh dist/assets/*
   ```

   Esperado:
   - vendor: ~60KB gzip
   - supabase: ~55KB gzip
   - app: ~20KB gzip

2. Se algum chunk > 100KB gzip:
   ```bash
   # Analyzer
   npm run build -- --analyze  # (se tiver plugin vitest-plugin-analyzer)
   
   # Ou manual:
   du -h dist/assets/*.js | sort -h
   ```

3. Remover imports não usados:
   ```bash
   grep -r "import.*from" src/ | grep -v node_modules
   # Verificar que tudo é realmente usado
   ```

4. Usar dynamic imports:
   ```typescript
   // ✓ Bom: lazy-loaded
   const Relatorio = lazy(() => import('./telas/Relatorio'))
   
   // ✗ Ruim: bundled eagerly
   import Relatorio from './telas/Relatorio'
   ```

### "CORS error ao chamar API Claude (Fase 2)"

**Sintoma:** `Access-Control-Allow-Origin` error ao chamar API Claude.

**Fix:** Usar Vercel API Route como proxy:

```typescript
// vercel/api/claude.ts (Fase 2)
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { texto } = await req.json()
  
  const res = await fetch('https://api.anthropic.com/v1/...', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.VITE_CLAUDE_API_KEY!,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ ... })
  })
  
  return NextResponse.json(await res.json())
}
```

---

## Scaling (Futuro)

Se app crescer (muitos usuários):

### Supabase

1. **Database:** Upgrade de tier (Professional $25/mês)
2. **Edge Functions:** Usar para processamento (ex: interpretação voz)
3. **Caching:** Redis para queries frequentes

### Vercel

1. **Auto-scaling:** Automático (sem configuração)
2. **Analytics:** Monitorar Web Vitals
3. **Cache:** Aumentar TTL se possível

### Banco de Dados

1. **Backups:** Ativar automated backups (Supabase)
2. **Replication:** Geo-redundancy (Supabase Pro)
3. **Indexes:** Adicionar em colunas frequentemente filtradas

---

## Rollback

Se deploy quebrou produção:

### Vercel Rollback

1. Ir para Vercel Dashboard → Deployments
2. Clicar em último deployment ok
3. Clique "Redeploy"

### Supabase Rollback

Se migration quebrou banco:

```bash
supabase db reset  # ⚠️ Cuidado! Deleta tudo, reaplica migrations
```

Em produção, melhor:

1. Criar nova migration `down_fix.sql`
2. Rodar: `supabase db push`
3. Testar
4. Fazer novo deploy Vercel

---

## Checklist Pré-Produção

Antes de fazer push para `main`:

- [ ] `npm run test` passa 100%
- [ ] `npm run build` sem warnings
- [ ] `npm run preview` funciona locally
- [ ] Testado em mobile (DevTools emulation)
- [ ] Env vars corretas em `.env.local`
- [ ] Sem console.log debug deixados
- [ ] Sem secrets/keys commitados
- [ ] Commit message em português
- [ ] Git history limpo (rebase se necessário)

---

## Contato & Suporte

- **Issues:** GitHub Issues (repo privado)
- **Docs:** Ver [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
