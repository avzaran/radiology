// ─── Пользователи ────────────────────────────────────────────
export type UserRole = 'doctor' | 'head' | 'admin'
export type SubscriptionTier = 'free' | 'pro' | 'clinic'

export interface User {
  id: string
  email: string
  role: UserRole
  full_name: string | null
  clinic_id: string | null
  subscription_tier: SubscriptionTier
  created_at: string
  updated_at: string
}

// ─── Пациенты ────────────────────────────────────────────────
export type PatientSex = 'male' | 'female' | 'unknown'

export interface Patient {
  id: string
  user_id: string
  pseudonym: string
  birth_year: number | null
  sex: PatientSex
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Образования внутри протокола ─────────────────────────────
// Образования не хранятся отдельно — они живут внутри reports.lesions_json.
// История измерений строится по цепочке протоколов одного пациента.
export interface LesionInReport {
  name: string          // идентификатор образования (напр. "Узел S6 прав. лёгкого")
  location?: string     // анатомическая локализация
  size_a: number        // наибольший размер, мм
  size_b?: number       // второй размер, мм
  size_c?: number       // третий размер, мм
  volume_mm3?: number   // V = (π/6) × a × b × c, вычисляется на клиенте
  scale_type?: string   // привязанная шкала (tirads, fleischner и т.д.)
  score?: string        // результат шкалы (TR3, Fleischner 3мес и т.д.)
}

// ─── Динамика образования (вычисляется на клиенте из цепочки протоколов) ──
export interface LesionTimepoint {
  date: string
  report_id: string
  size_a: number
  size_b?: number
  size_c?: number
}

export interface LesionTimeline {
  name: string
  points: LesionTimepoint[]
  vdt_days?: number
  growth_percent?: number
}

// ─── Заключения ───────────────────────────────────────────────
export type Modality = 'ct' | 'mri' | 'xray' | 'us' | 'mammography'

export interface Report {
  id: string
  user_id: string
  patient_id: string | null
  modality: Modality
  region: string | null
  contrast: boolean
  description: string | null
  conclusion: string | null
  content: string | null
  template_id: string | null
  lesions_json: LesionInReport[]
  created_at: string
  updated_at: string
}

// ─── Результаты шкал ─────────────────────────────────────────
export type ScaleType = 'tirads' | 'fleischner' | 'birads' | 'lungrads'

export interface ScaleResult {
  id: string
  user_id: string
  patient_id: string | null
  report_id: string | null
  scale_type: ScaleType
  input_json: Record<string, unknown>
  score: string | null
  result: string | null
  created_at: string
}

// ─── Утилиты расчёта (чистые функции, используются на клиенте и сервере) ──
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

// ─── API ответы ───────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}
