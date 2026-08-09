# Fluxo de Captura por Voz — Fase 2

Documentação do design de captura de tarefas por voz natural em português brasileiro.

---

## Visão Geral

Fase 2 adiciona captura por voz ao FOXDay:

**Fluxo do usuário:**

1. User abre app e vê botão 🎤 **"Voz"** na captura
2. Clica 🎤 → browser ativa microfone (permissão)
3. User fala naturalmente: *"ligar pro contador amanhã importante"*
4. App transcende (Web Speech API) e interpreta (API Claude)
5. Modal de confirmação mostra: *"Ligar pro contador → Amanhã (Importante) — Confiança: 95%"*
6. User clica OK → tarefa criada instantaneamente (optimistic)

---

## Arquitetura

```
┌──────────────────────────────────────────────────┐
│ Usuário fala                                     │
└─────────────────────┬──────────────────────────┘
                      ↓
         ┌────────────────────────┐
         │ Web Speech API         │
         │ (nativa do browser)    │
         └────────────┬───────────┘
                      ↓
           Transcrição: "ligar pro contador amanhã"
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ APIClaudeClient.interpretarVoz(texto)                       │
│                                                             │
│ POST https://api.anthropic.com/v1/messages                │
│ {                                                           │
│   "model": "claude-3-5-sonnet-20241022",                  │
│   "messages": [{                                            │
│     "role": "user",                                         │
│     "content": "Interprete: 'ligar pro contador amanhã'..." │
│   }]                                                        │
│ }                                                           │
└─────────────────────┬──────────────────────────────────────┘
                      ↓
        JSON Response: { tarefa, classificacao, data, confianca }
                      ↓
        ┌─────────────────────────────┐
        │ Modal de Confirmação        │
        │                             │
        │ 📝 Ligar pro contador       │
        │ 📅 Amanhã                   │
        │ 🏷️  Importante              │
        │ Confiança: 95%              │
        │                             │
        │ [Cancelar] [Confirmar]      │
        └────────────┬────────────────┘
                     ↓ (click Confirmar)
      ┌──────────────────────────────┐
      │ Optimistic Update:           │
      │ - Local state: setTarefas()  │
      │ - Render tarefa              │
      └────────────┬─────────────────┘
                   ↓
      ┌──────────────────────────────┐
      │ supabaseCall() async:        │
      │ INSERT tarefa                │
      │ (confirm no servidor)        │
      └────────────┬─────────────────┘
                   ↓
        Sucesso ou Rollback (se erro)
```

---

## UI/UX Design

### Layout Principal

```
┌─────────────────────────────────────────────┐
│ Hoje                                        │
├─────────────────────────────────────────────┤
│ [Tarefas de hoje...]                        │
├─────────────────────────────────────────────┤
│ CAPTURA RÁPIDA                              │
│                                             │
│ [✓ Tarefa] [✎ Anotação] [🎤 Voz]           │
│ ↑           ↑              ↑                │
│ Texto      Texto livre   NOVO: Voz         │
│                                             │
│ [Input: "O que precisa?"]                   │
│ [Importante] [Urgente] [Circunstancial]    │
└─────────────────────────────────────────────┘
```

### Estados da Captura por Voz

#### Estado 1: Pronto (default)

```
[🎤 Voz]  ← botão pronto para usar
```

#### Estado 2: Escutando (ativo)

```
┌─────────────────────┐
│ 🎤 Escutando...     │ (animação: pulsing red)
│                     │
│ (aperte para parar) │
└─────────────────────┘
```

#### Estado 3: Processando

```
┌─────────────────────┐
│ ⏳ Processando...    │
│ (interpretando)      │
└─────────────────────┘
```

#### Estado 4: Confirmação

```
┌─────────────────────────────────────┐
│ ✓ Confirmar Tarefa                  │
├─────────────────────────────────────┤
│ Voz: "ligar pro contador amanhã"    │
│                                     │
│ 📝 Tarefa: ligar pro contador       │
│ 📅 Data: Amanhã                     │
│ 🏷️  Categoria: Importante           │
│ 📊 Confiança: 92%                   │
│                                     │
│ [Cancelar] [Confirmar] [Editar]     │
└─────────────────────────────────────┘
```

---

## Exemplos de Interpretação

### Exemplo 1: Simples

```
Voz: "comprar pão"
JSON: {
  "tarefa": "comprar pão",
  "classificacao": "circunstancial",
  "data": "hoje",
  "confianca": 98
}
```

### Exemplo 2: Com data e classificação

```
Voz: "ligar pro contador amanhã importante"
JSON: {
  "tarefa": "ligar pro contador",
  "classificacao": "importante",
  "data": "amanha",
  "confianca": 95
}
```

### Exemplo 3: Urgente com hora

```
Voz: "urgente resolver o bug do dashboard"
JSON: {
  "tarefa": "resolver o bug do dashboard",
  "classificacao": "urgente",
  "data": "hoje",
  "confianca": 92
}
```

### Exemplo 4: Ambíguo (baixa confiança)

```
Voz: "isso e aquilo por aí"  ← confuso
JSON: {
  "tarefa": "isso e aquilo por aí",
  "classificacao": "circunstancial",
  "data": "hoje",
  "confianca": 45  ← BAIXO: pedir user para repetir
}
```

---

## Implementação (Roadmap Fase 2)

### Sprint 2a: Web Speech API + Modal Confirmação (2 dias)

**Novos arquivos:**

1. `src/hooks/useVozCaptura.ts` — Web Speech API hook
   ```typescript
   export function useVozCaptura() {
     const [escutando, setEscutando] = useState(false)
     const [transcricao, setTranscricao] = useState('')
     const [erro, setErro] = useState('')
     
     const iniciar = () => {
       const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
       recognition.lang = 'pt-BR'
       recognition.start()
       setEscutando(true)
       
       recognition.onresult = (event) => {
         const texto = Array.from(event.results)
           .map(result => result[0].transcript)
           .join('')
         setTranscricao(texto)
       }
       
       recognition.onerror = (event) => {
         setErro(`Erro: ${event.error}`)
         setEscutando(false)
       }
       
       recognition.onend = () => setEscutando(false)
     }
     
     return { escutando, transcricao, erro, iniciar }
   }
   ```

2. `src/componentes/ModalConfirmacaoVoz.tsx` — Modal com preview
   ```typescript
   interface Props {
     interpretacao: InterpretacaoVoz
     onConfirmar: () => void
     onCancelar: () => void
     onEditar: (texto: string) => void
   }
   
   export function ModalConfirmacaoVoz({...}: Props) {
     return (
       <div className="modal-voz">
         {/* renderizar interpretacao */}
       </div>
     )
   }
   ```

3. Integrar em `src/telas/Hoje.tsx`
   ```typescript
   const { escutando, transcricao, iniciar } = useVozCaptura()
   
   return (
     <div className="captura-modos">
       <button
         className={modo === 'tarefa' ? 'chip ativo' : 'chip'}
         onClick={() => setModo('tarefa')}
       >
         ✓ Tarefa
       </button>
       <button
         className={modo === 'obs' ? 'chip ativo' : 'chip'}
         onClick={() => setModo('obs')}
       >
         ✎ Anotação
       </button>
       <button
         className={modo === 'voz' ? 'chip ativo' : 'chip'}
         onClick={() => setModo('voz')}
       >
         🎤 Voz
       </button>
     </div>
   )
   ```

**Testes:**
- Web Speech API funciona em Chrome, Safari, Edge
- Modal aparece após transcrição
- Buttons funcionam (Cancelar, Confirmar)

---

### Sprint 2b: Integração API Claude (1 dia)

**Implementar `APIClaudeClient.interpretarVoz()`:**

```typescript
async interpretarVoz(texto: string): Promise<InterpretacaoVoz> {
  const response = await fetch(`${this.config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: this.gerarPrompt(texto),
        },
      ],
    }),
  })

  const data = await response.json()
  
  // Parse JSON do response
  const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/)
  const resultado = JSON.parse(jsonMatch?.[0] || '{}')
  
  return {
    texto: resultado.tarefa || texto,
    classificacao: resultado.classificacao || 'circunstancial',
    data: resultado.data || 'hoje',
    confianca: resultado.confianca || 0,
  }
}

private gerarPrompt(texto: string): string {
  return `
Você é um assistente especializado em interpretar tarefas faladas em português brasileiro.

O usuário fala uma tarefa. Você deve extrair:
1. tarefa (string): descrição concisa
2. classificacao (importante | urgente | circunstancial): baseado em contexto
3. data (hoje | amanha): quando fazer
4. confianca (0-100): certeza na interpretação

Responda em JSON válido:
{
  "tarefa": "...",
  "classificacao": "...",
  "data": "...",
  "confianca": 90
}

Frase: "${texto}"
  `.trim()
}
```

**Variável de ambiente:**
```
VITE_CLAUDE_API_KEY=sk-ant-...
```

---

### Sprint 2c: Refinamento & Testes (1 dia)

- Melhorar accuracy do prompt Claude
- Adicionar fallback se API falha (mostrar transcrição bruta)
- Teste de e2e: falar → confirmar → tarefa criada
- Analytics: rastrear taxa de sucesso

---

## Tratamento de Erros

### Confiança Baixa (< 70%)

```
Modal com aviso:
┌──────────────────────────────┐
│ ⚠️ Confiança baixa (45%)     │
│                              │
│ Transcrição: "isso e aquilo" │
│                              │
│ [Repetir] [Editar] [Cancelar]│
└──────────────────────────────┘
```

### Erro de Parsing

```
Se API Claude retornar erro ou JSON inválido:
┌─────────────────────────────────────────┐
│ Erro ao processar voz                   │
│                                         │
│ Transcrição: "ligar pro contador"      │
│ [Editar como texto] [Cancelar]          │
└─────────────────────────────────────────┘
```

### Web Speech API Não Suportada

```
├─ Chrome: ✓ Funciona
├─ Firefox: ❌ Usar fallback manual
├─ Safari (iOS): ✓ Funciona (iOS 14.5+)
├─ Edge: ✓ Funciona
└─ IE: ❌ Não suportado (hide botão)

Fallback: permitir digitação manual (já existe)
```

### Offline

```
Se sem internet (offline mode):
├─ Desabilitar botão 🎤
└─ Mostrar tooltip: "Conecte para usar voz"
```

---

## Prompt Claude (WIP)

Versão final será refinada durante Sprint 2b:

```
Você é um assistente especializado em interpretar tarefas faladas em português brasileiro.

O usuário fala uma tarefa em linguagem natural. Você deve extrair:
1. **Tarefa** (string): descrição concisa (máx 60 caracteres)
2. **Classificação** (importante | urgente | circunstancial): baseado em contexto
3. **Data** (hoje | amanha): quando fazer (não adicionar horários)
4. **Confiança** (0-100): seu nível de certeza na interpretação

Se confiança < 70%, retornar tarefa "bruta" (sem interpretação).

Responda APENAS em JSON válido:
{
  "tarefa": "...",
  "classificacao": "importante" | "urgente" | "circunstancial",
  "data": "hoje" | "amanha",
  "confianca": 0-100
}

Exemplos:
1. Frase: "ligar pro contador amanhã importante"
   → { "tarefa": "ligar pro contador", "classificacao": "importante", "data": "amanha", "confianca": 98 }

2. Frase: "comprar pão"
   → { "tarefa": "comprar pão", "classificacao": "circunstancial", "data": "hoje", "confianca": 95 }

3. Frase: "urgente resolver bug dashboard hoje 3pm"
   → { "tarefa": "resolver bug dashboard", "classificacao": "urgente", "data": "hoje", "confianca": 92 }

4. Frase: "isso e aquilo sei lá"  ← ambíguo
   → { "tarefa": "isso e aquilo sei lá", "classificacao": "circunstancial", "data": "hoje", "confianca": 30 }

Agora, interprete:
Frase: "{frase_do_usuario}"
```

---

## Dados de Produto

### Success Metrics (Fase 2)

- Taxa de sucesso (confiança > 70%): > 85%
- Latência média (transcrição + interpretação): < 3s
- Taxa de adoção (% users usando voz): > 40%
- Taxa de erro/rollback: < 5%

### Analytics para Rastrear

```typescript
// Em ModalConfirmacaoVoz:
log('voz_confirmacao_modal', {
  confianca: interpretacao.confianca,
  classificacao: interpretacao.classificacao,
  data: interpretacao.data,
  timestamp: new Date().toISOString(),
})

// Ao confirmar:
log('voz_tarefa_criada', {
  confianca: interpretacao.confianca,
  success: true,
})

// Se erro:
logErro('voz_erro_api', erro)
```

---

## Accessibility

- Labels explícitos: `<label htmlFor="boto-voz">Capturar por voz</label>`
- Aria-live para feedback: `<div aria-live="polite">Escutando...</div>`
- Focus visible no botão 🎤
- Teclado: ESC para cancelar modal

---

## Próximos Passos

1. **Sprint 2a:** Implementar Web Speech API + Modal (2 dias)
2. **Sprint 2b:** Integrar API Claude (1 dia)
3. **Sprint 2c:** Refinamento & testes (1 dia)
4. **Beta:** Testar com usuários reais (feedback loop)
5. **Sprint 2d:** Release Fase 2

---

## Referências

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Claude Models](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [iOS VoiceOver Support](https://support.apple.com/en-us/108806)
