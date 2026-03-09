import type { FastifyInstance } from 'fastify'
import knex from '../db/knex'

interface LesionInReport {
  name: string
  location?: string
  size_a: number      // наибольший размер в мм
  size_b?: number
  size_c?: number
  volume_mm3?: number // (π/6) × a × b × c — вычисляется на клиенте
  scale_type?: string // привязанный результат шкалы
  score?: string
}

export async function reportRoutes(app: FastifyInstance) {
  const authenticate = app.authenticate.bind(app)

  // POST /reports/generate — создание протокола
  app.post<{
    Body: {
      patient_id?: string
      modality: string
      region?: string
      contrast?: boolean
      description?: string
      conclusion?: string
      template_id?: string
      lesions_json?: LesionInReport[]
    }
  }>(
    '/reports/generate',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['modality'],
          properties: {
            patient_id: { type: 'string' },
            modality: { type: 'string', enum: ['ct', 'mri', 'xray', 'us', 'mammography'] },
            region: { type: 'string' },
            contrast: { type: 'boolean' },
            description: { type: 'string' },
            conclusion: { type: 'string' },
            template_id: { type: 'string' },
            lesions_json: { type: 'array' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string }
      const body = request.body
      const content = buildProtocol(body)

      const [report] = await knex('reports')
        .insert({
          user_id: user.id,
          patient_id: body.patient_id ?? null,
          modality: body.modality,
          region: body.region ?? null,
          contrast: body.contrast ?? false,
          description: body.description ?? null,
          conclusion: body.conclusion ?? null,
          template_id: body.template_id ?? null,
          lesions_json: JSON.stringify(body.lesions_json ?? []),
          content,
        })
        .returning('*')

      return reply.status(201).send({ data: report })
    }
  )

  // PUT /reports/:id — редактирование протокола
  app.put<{
    Params: { id: string }
    Body: Partial<{
      modality: string
      region: string
      contrast: boolean
      description: string
      conclusion: string
      lesions_json: LesionInReport[]
    }>
  }>(
    '/reports/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as { id: string }
      const updates: Record<string, unknown> = { ...request.body }
      if (updates['lesions_json']) {
        updates['lesions_json'] = JSON.stringify(updates['lesions_json'])
      }
      // Пересобираем текст протокола если изменилось содержимое
      const existing = await knex('reports').where({ id: request.params.id, user_id: user.id }).first()
      if (!existing) return reply.status(404).send({ message: 'Протокол не найден' })

      const merged = { ...existing, ...request.body }
      updates['content'] = buildProtocol(merged)

      const [report] = await knex('reports')
        .where({ id: request.params.id, user_id: user.id })
        .update(updates)
        .returning('*')

      return reply.send({ data: report })
    }
  )

  // GET /reports — список протоколов текущего врача
  app.get<{ Querystring: { patient_id?: string; limit?: number; offset?: number } }>(
    '/reports',
    { preHandler: authenticate },
    async (request) => {
      const user = request.user as { id: string }
      const { patient_id, limit = 20, offset = 0 } = request.query

      const query = knex('reports')
        .where({ user_id: user.id })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)

      if (patient_id) query.where({ patient_id })

      const [reports, [{ count }]] = await Promise.all([
        query,
        knex('reports').where({ user_id: user.id }).count('id as count'),
      ])

      return { data: reports, total: Number(count) }
    }
  )

  // GET /reports/:id — один протокол
  app.get<{ Params: { id: string } }>('/reports/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { id: string }
    const report = await knex('reports').where({ id: request.params.id, user_id: user.id }).first()
    if (!report) return reply.status(404).send({ message: 'Протокол не найден' })
    return { data: report }
  })

  // DELETE /reports/:id
  app.delete<{ Params: { id: string } }>('/reports/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { id: string }
    await knex('reports').where({ id: request.params.id, user_id: user.id }).delete()
    return reply.status(204).send()
  })
}

// ─── Построение текста протокола ──────────────────────────────
function buildProtocol(body: {
  modality: string
  region?: string | null
  contrast?: boolean | null
  description?: string | null
  conclusion?: string | null
  lesions_json?: LesionInReport[] | null
}): string {
  const modalityNames: Record<string, string> = {
    ct: 'Компьютерная томография',
    mri: 'Магнитно-резонансная томография',
    xray: 'Рентгенография',
    us: 'Ультразвуковое исследование',
    mammography: 'Маммография',
  }

  const lines: string[] = []
  lines.push('ПРОТОКОЛ ИССЛЕДОВАНИЯ')
  lines.push(
    `Вид: ${modalityNames[body.modality] ?? body.modality}${body.region ? ` — ${body.region}` : ''}`
  )
  if (body.contrast !== undefined && body.contrast !== null) {
    lines.push(`Контрастное усиление: ${body.contrast ? 'применялось' : 'не применялось'}`)
  }

  if (body.description) {
    lines.push('')
    lines.push('ОПИСАНИЕ:')
    lines.push(body.description)
  }

  const lesions = body.lesions_json ?? []
  if (lesions.length > 0) {
    lines.push('')
    lines.push('ОБРАЗОВАНИЯ:')
    for (const l of lesions) {
      const dims = [l.size_a, l.size_b, l.size_c].filter(Boolean).join(' × ')
      const score = l.score ? ` [${l.scale_type?.toUpperCase() ?? 'шкала'}: ${l.score}]` : ''
      lines.push(`• ${l.name}${l.location ? ` (${l.location})` : ''}: ${dims} мм${score}`)
    }
  }

  if (body.conclusion) {
    lines.push('')
    lines.push('ЗАКЛЮЧЕНИЕ:')
    lines.push(body.conclusion)
  }

  return lines.join('\n')
}
