// Utilitários de data — sempre no fuso local do usuário (o "dia" do FOXDay é o dia local).

export function dataISO(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function hojeISO(agora: Date = new Date()): string {
  return dataISO(agora)
}

export function adicionarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  return dataISO(new Date(a, m - 1, d + dias))
}

export function formatarDataLonga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatarDataCurta(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

// horario no formato "HH:MM" ou "HH:MM:SS" (como vem da coluna time do Postgres)
export function passouDoHorario(horario: string, agora: Date = new Date()): boolean {
  const [h, min] = horario.split(':').map(Number)
  return agora.getHours() > h || (agora.getHours() === h && agora.getMinutes() >= min)
}
