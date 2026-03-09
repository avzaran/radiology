// Утилиты расчёта — переиспользуются в генераторе и в будущем модуле динамики

export function calcVolume(a: number, b?: number, c?: number): number {
  return (Math.PI / 6) * a * (b ?? a) * (c ?? a)
}

export function calcVDT(d1: number, d2: number, deltaDays: number): number | null {
  if (d1 <= 0 || d2 <= 0 || deltaDays <= 0) return null
  return (deltaDays * Math.LN2) / (3 * Math.log(d2 / d1))
}

export function calcGrowthPercent(d1: number, d2: number): number {
  return ((d2 - d1) / d1) * 100
}

export function formatVDT(vdt: number | null): string {
  if (vdt === null || !isFinite(vdt) || vdt < 0) return '—'
  if (vdt < 30) return `${Math.round(vdt)} дн (быстрый рост)`
  if (vdt < 400) return `${Math.round(vdt)} дн (подозрительно)`
  return `${Math.round(vdt)} дн (медленный)`
}

export function vdtRiskColor(vdt: number | null): string {
  if (vdt === null || !isFinite(vdt) || vdt < 0) return '#64748B'
  if (vdt < 100) return '#EF4444'
  if (vdt < 400) return '#F97316'
  return '#22C55E'
}
