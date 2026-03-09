// ─── Типы ────────────────────────────────────────────────────────────────────

export interface Template {
  id: string
  modality: string | null
  region: string | null
  section: 'description' | 'conclusion'
  keywords: string[]
  text: string
  priority: number
}

export interface Suggestion {
  template: Template
  score: number
  matchedKeywords: string[]
}

// ─── Движок подбора шаблонов ─────────────────────────────────────────────────

export function getSuggestions(
  input: string,
  templates: Template[],
  opts: {
    section: 'description' | 'conclusion'
    modality: string
    region: string
    maxResults?: number
  }
): Suggestion[] {
  const { section, modality, region, maxResults = 3 } = opts

  // Фильтрация шаблонов по модальности, области и секции
  const relevant = templates.filter(
    (t) =>
      t.section === section &&
      (!t.modality || t.modality === modality) &&
      (!t.region ||
        region.toLowerCase().includes(t.region.toLowerCase()) ||
        t.region.toLowerCase().includes(region.toLowerCase()))
  )

  // Если текст слишком короткий — показываем топ по приоритету
  if (input.trim().length < 15) {
    return relevant
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxResults)
      .map((template) => ({ template, score: template.priority, matchedKeywords: [] }))
  }

  // Токенизация контекста (последние 350 символов)
  const context = input.slice(-350).toLowerCase()
  const contextWords = context
    .split(/[\s,./;:()\[\]!?–—«»"']+/)
    .filter((w) => w.length > 2)

  // Скоринг по совпадению ключевых слов + бонус за приоритет
  const scored: Suggestion[] = relevant.map((template) => {
    const matchedKeywords = template.keywords.filter((kw) => {
      const kwLower = kw.toLowerCase()
      return contextWords.some((w) => w.includes(kwLower) || kwLower.includes(w))
    })
    const kwRatio = matchedKeywords.length / Math.max(template.keywords.length, 1)
    const score = kwRatio * 10 + template.priority * 0.2
    return { template, score, matchedKeywords }
  })

  return scored
    .filter((s) => s.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}
