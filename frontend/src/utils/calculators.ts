export interface CalcResult {
  score: number
  scoreLabel: string
  category: string
  risk: 'green' | 'yellow' | 'orange' | 'red' | 'neutral'
  recommendation: string
}

// ─── TI-RADS ACR 2017 ────────────────────────────────────────────────────────

export interface TiRadsInput {
  composition: 'cystic' | 'spongiform' | 'mixed' | 'solid'
  echogenicity: 'anechoic' | 'hyperiso' | 'hypo' | 'very_hypo'
  shape: 'wider' | 'taller'
  margin: 'smooth' | 'ill_defined' | 'lobulated' | 'extrathyroidal'
  foci: 'none' | 'macrocalc' | 'peripheral' | 'punctate'
  sizeMax?: number
}

export function calcTiRads(input: TiRadsInput): CalcResult {
  const comp = { cystic: 0, spongiform: 0, mixed: 1, solid: 2 }[input.composition]
  const echo = { anechoic: 0, hyperiso: 1, hypo: 2, very_hypo: 3 }[input.echogenicity]
  const shape = { wider: 0, taller: 3 }[input.shape]
  const margin = { smooth: 0, ill_defined: 0, lobulated: 2, extrathyroidal: 3 }[input.margin]
  const foci = { none: 0, macrocalc: 1, peripheral: 2, punctate: 3 }[input.foci]

  const score = comp + echo + shape + margin + foci

  let category: string
  let risk: CalcResult['risk']
  // ACR TI-RADS 2017: FNA threshold / US follow-up threshold
  let fnaMin: number
  let usMin: number

  if (score <= 1) {
    category = 'TR1'; risk = 'green'; fnaMin = 0; usMin = 0
  } else if (score === 2) {
    category = 'TR2'; risk = 'green'; fnaMin = 0; usMin = 0
  } else if (score === 3) {
    category = 'TR3'; risk = 'yellow'; fnaMin = 25; usMin = 15
  } else if (score <= 6) {
    category = 'TR4'; risk = 'orange'; fnaMin = 15; usMin = 10
  } else {
    category = 'TR5'; risk = 'red'; fnaMin = 10; usMin = 5
  }

  let recommendation: string
  if (category === 'TR1' || category === 'TR2') {
    recommendation = 'Наблюдение не требуется'
  } else {
    const sz = input.sizeMax
    if (sz === undefined || sz === 0) {
      recommendation = `ФНА при ≥${fnaMin} мм; контрольное УЗИ при ≥${usMin} мм`
    } else if (sz >= fnaMin) {
      recommendation = 'Рекомендована ФНА'
    } else if (sz >= usMin) {
      recommendation = 'Рекомендовано контрольное УЗИ'
    } else {
      recommendation = `Без наблюдения (ФНА при ≥${fnaMin} мм; контрольное УЗИ при ≥${usMin} мм)`
    }
  }

  return { score, scoreLabel: String(score), category, risk, recommendation }
}

// ─── Fleischner Society 2017 ─────────────────────────────────────────────────

export interface FleischnerInput {
  noduleType: 'solid' | 'ggn' | 'partsolid'
  riskLevel: 'low' | 'high'
  sizeMm: number
}

export function calcFleischner(input: FleischnerInput): CalcResult | null {
  if (input.sizeMm === 0) return null

  const { noduleType, riskLevel, sizeMm } = input

  let category: string
  let risk: CalcResult['risk']
  let recommendation: string

  if (noduleType === 'solid') {
    if (riskLevel === 'low') {
      if (sizeMm < 6) {
        category = '<6 мм'; risk = 'green'
        recommendation = 'Наблюдение не требуется'
      } else if (sizeMm <= 8) {
        category = '6–8 мм'; risk = 'yellow'
        recommendation = 'КТ через 6–12 месяцев'
      } else {
        category = '>8 мм'; risk = 'orange'
        recommendation = 'КТ через 3 мес или ПЭТ-КТ / биопсия'
      }
    } else {
      if (sizeMm < 6) {
        category = '<6 мм'; risk = 'yellow'
        recommendation = 'Опционально КТ через 12 месяцев'
      } else if (sizeMm <= 8) {
        category = '6–8 мм'; risk = 'orange'
        recommendation = 'КТ через 6–12 месяцев'
      } else {
        category = '>8 мм'; risk = 'red'
        recommendation = 'КТ через 3 мес или ПЭТ-КТ / биопсия'
      }
    }
  } else if (noduleType === 'ggn') {
    if (sizeMm < 6) {
      category = '<6 мм'; risk = 'green'
      recommendation = 'Наблюдение не требуется'
    } else {
      category = '≥6 мм'; risk = 'yellow'
      recommendation = 'КТ через 6–12 мес, затем каждые 2 года в течение 5 лет'
    }
  } else {
    // partsolid
    if (sizeMm < 6) {
      category = '<6 мм'; risk = 'green'
      recommendation = 'Наблюдение не требуется'
    } else {
      category = '≥6 мм'; risk = 'orange'
      recommendation = 'КТ через 3–6 мес; при сохранении — ежегодно в течение 5 лет'
    }
  }

  return { score: sizeMm, scoreLabel: `${sizeMm} мм`, category, risk, recommendation }
}

// ─── Pi-RADS v2.1 ────────────────────────────────────────────────────────────

export interface PiRadsInput {
  zone: 'pz' | 'tz'
  t2w: 1 | 2 | 3 | 4 | 5
  dwi: 1 | 2 | 3 | 4 | 5
  dce: 'positive' | 'negative'
}

export function calcPiRads(input: PiRadsInput): CalcResult {
  let score: number

  if (input.zone === 'pz') {
    // Периферическая зона: доминирует DWI
    if (input.dwi <= 2) {
      score = input.dwi
    } else if (input.dwi === 3) {
      score = input.dce === 'positive' ? 4 : 3
    } else {
      score = input.dwi
    }
  } else {
    // Переходная зона: доминирует T2W
    if (input.t2w <= 2) {
      score = input.t2w
    } else if (input.t2w === 3) {
      score = input.dwi >= 4 ? 4 : 3
    } else {
      score = input.t2w
    }
  }

  const data: Record<number, { category: string; risk: CalcResult['risk']; recommendation: string }> = {
    1: { category: 'Pi-RADS 1', risk: 'green',  recommendation: 'Клинически значимое заболевание крайне маловероятно' },
    2: { category: 'Pi-RADS 2', risk: 'green',  recommendation: 'Клинически значимое заболевание маловероятно' },
    3: { category: 'Pi-RADS 3', risk: 'yellow', recommendation: 'Клиническая значимость неопределённа. Рассмотреть биопсию или МРТ-контроль' },
    4: { category: 'Pi-RADS 4', risk: 'orange', recommendation: 'Клинически значимое заболевание вероятно. Рекомендована биопсия' },
    5: { category: 'Pi-RADS 5', risk: 'red',    recommendation: 'Клинически значимое заболевание весьма вероятно. Биопсия обязательна' },
  }

  const { category, risk, recommendation } = data[score]
  return { score, scoreLabel: String(score), category, risk, recommendation }
}

// ─── Lung-RADS 2022 ──────────────────────────────────────────────────────────

export interface LungRadsInput {
  scanType: 'baseline' | 'annual'
  category: '1' | '2' | '3' | '4A' | '4B' | '4X'
}

const LUNGRADS_DATA: Record<
  string,
  { risk: CalcResult['risk']; description: string; recommendation: string }
> = {
  '1':  { risk: 'green',  description: 'Нет узлов или заведомо доброкачественные изменения', recommendation: 'Ежегодное НДКТ' },
  '2':  { risk: 'green',  description: 'Доброкачественные признаки (кальцификация, жир, чистое матовое стекло <30 мм)', recommendation: 'Ежегодное НДКТ' },
  '3':  { risk: 'yellow', description: 'Вероятно доброкачественные (солидный 6–7 мм, частично солидный <6 мм)', recommendation: 'КТ через 6 месяцев' },
  '4A': { risk: 'orange', description: 'Подозрительные (солидный 8–14 мм, частично солидный ≥6 мм)', recommendation: 'КТ через 3 месяца' },
  '4B': { risk: 'red',    description: 'Более подозрительные (солидный ≥15 мм, солидный компонент ≥8 мм)', recommendation: 'ПЭТ-КТ или биопсия' },
  '4X': { risk: 'red',    description: 'Дополнительные признаки (спикуляция, плевральная тракция)', recommendation: 'ПЭТ-КТ + мультидисциплинарное обсуждение' },
}

export function calcLungRads(input: LungRadsInput): CalcResult {
  const data = LUNGRADS_DATA[input.category]
  return {
    score: 0,
    scoreLabel: input.category,
    category: `Lung-RADS ${input.category}`,
    risk: data.risk,
    recommendation: data.recommendation,
  }
}

export function getLungRadsDescription(category: LungRadsInput['category']): string {
  return LUNGRADS_DATA[category]?.description ?? ''
}
