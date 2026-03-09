import type { FastifyInstance } from 'fastify'
import knex from '../db/knex'

export async function patientRoutes(app: FastifyInstance) {
  const authenticate = app.authenticate.bind(app)

  // GET /patients — список пациентов текущего врача
  app.get('/patients', { preHandler: authenticate }, async (request) => {
    const user = request.user as { id: string }
    const patients = await knex('patients')
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc')
    return { data: patients }
  })

  // POST /patients — создание пациента
  app.post<{ Body: { pseudonym: string; birth_year?: number; sex?: string; notes?: string } }>(
    '/patients',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['pseudonym'],
          properties: {
            pseudonym: { type: 'string', minLength: 1 },
            birth_year: { type: 'integer', minimum: 1900, maximum: 2100 },
            sex: { type: 'string', enum: ['male', 'female', 'unknown'] },
            notes: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string }
      const [patient] = await knex('patients')
        .insert({ user_id: user.id, ...request.body })
        .returning('*')
      return reply.status(201).send({ data: patient })
    }
  )

  // GET /patients/:id — карточка пациента
  app.get<{ Params: { id: string } }>('/patients/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { id: string }
    const patient = await knex('patients').where({ id: request.params.id, user_id: user.id }).first()
    if (!patient) return reply.status(404).send({ message: 'Пациент не найден' })
    return { data: patient }
  })

  // PUT /patients/:id
  app.put<{ Params: { id: string }; Body: Partial<{ pseudonym: string; birth_year: number; sex: string; notes: string }> }>(
    '/patients/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as { id: string }
      const [patient] = await knex('patients')
        .where({ id: request.params.id, user_id: user.id })
        .update(request.body)
        .returning('*')
      if (!patient) return reply.status(404).send({ message: 'Пациент не найден' })
      return { data: patient }
    }
  )

  // DELETE /patients/:id
  app.delete<{ Params: { id: string } }>('/patients/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { id: string }
    await knex('patients').where({ id: request.params.id, user_id: user.id }).delete()
    return reply.status(204).send()
  })

  // GET /patients/:id/reports — история протоколов пациента (для сравнения образований)
  app.get<{ Params: { id: string } }>('/patients/:id/reports', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { id: string }
    const patient = await knex('patients').where({ id: request.params.id, user_id: user.id }).first()
    if (!patient) return reply.status(404).send({ message: 'Пациент не найден' })

    const reports = await knex('reports')
      .where({ patient_id: request.params.id, user_id: user.id })
      .orderBy('created_at', 'desc')
      .select('id', 'modality', 'region', 'conclusion', 'lesions_json', 'created_at')

    return { data: { patient, reports } }
  })

  // GET /patients/:id/lesions-history — агрегированная история образований из всех протоколов
  // Полезно для построения графика динамики без отдельной таблицы
  app.get<{ Params: { id: string } }>('/patients/:id/lesions-history', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { id: string }
    const patient = await knex('patients').where({ id: request.params.id, user_id: user.id }).first()
    if (!patient) return reply.status(404).send({ message: 'Пациент не найден' })

    const reports = await knex('reports')
      .where({ patient_id: request.params.id, user_id: user.id })
      .whereNotNull('lesions_json')
      .orderBy('created_at', 'asc')
      .select('id', 'created_at', 'modality', 'lesions_json')

    // Группируем измерения по имени образования для построения временной динамики
    const lesionMap: Record<string, { date: string; report_id: string; size_a: number; size_b?: number; size_c?: number }[]> = {}

    for (const report of reports) {
      const lesions = (report.lesions_json as LesionEntry[]) ?? []
      for (const lesion of lesions) {
        if (!lesion.name) continue
        if (!lesionMap[lesion.name]) lesionMap[lesion.name] = []
        lesionMap[lesion.name].push({
          date: report.created_at,
          report_id: report.id,
          size_a: lesion.size_a,
          size_b: lesion.size_b,
          size_c: lesion.size_c,
        })
      }
    }

    return { data: { patient, lesion_timelines: lesionMap } }
  })
}

interface LesionEntry {
  name?: string
  size_a: number
  size_b?: number
  size_c?: number
  location?: string
  score?: string
}
