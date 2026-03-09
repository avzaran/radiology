import type { FastifyInstance } from 'fastify'
import knex from '../db/knex.js'

export async function lesionRoutes(app: FastifyInstance) {
  const authenticate = async (req: Parameters<typeof app.authenticate>[0]) => app.authenticate(req)

  // GET /lesions — список образований текущего пользователя
  app.get('/lesions', { preHandler: authenticate }, async (request) => {
    const user = request.user as { id: string }
    const lesions = await knex('lesions')
      .join('patients', 'lesions.patient_id', 'patients.id')
      .where('patients.user_id', user.id)
      .select('lesions.*', 'patients.pseudonym as patient_pseudonym')
      .orderBy('lesions.created_at', 'desc')
    return { data: lesions }
  })

  // POST /lesions — создание образования
  app.post<{ Body: { patient_id: string; name: string; type?: string; location?: string; description?: string } }>(
    '/lesions',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['patient_id', 'name'],
          properties: {
            patient_id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const [lesion] = await knex('lesions').insert(request.body).returning('*')
      return reply.status(201).send({ data: lesion })
    }
  )

  // GET /lesions/:id
  app.get<{ Params: { id: string } }>('/lesions/:id', { preHandler: authenticate }, async (request, reply) => {
    const lesion = await knex('lesions').where({ id: request.params.id }).first()
    if (!lesion) return reply.status(404).send({ message: 'Образование не найдено' })
    return { data: lesion }
  })

  // PUT /lesions/:id
  app.put<{ Params: { id: string }; Body: Partial<{ name: string; type: string; location: string; description: string }> }>(
    '/lesions/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const [lesion] = await knex('lesions').where({ id: request.params.id }).update(request.body).returning('*')
      if (!lesion) return reply.status(404).send({ message: 'Образование не найдено' })
      return { data: lesion }
    }
  )

  // DELETE /lesions/:id
  app.delete<{ Params: { id: string } }>('/lesions/:id', { preHandler: authenticate }, async (request, reply) => {
    await knex('lesions').where({ id: request.params.id }).delete()
    return reply.status(204).send()
  })

  // POST /lesions/:id/measurements — добавление измерения
  app.post<{
    Params: { id: string }
    Body: { measured_at: string; size_a_mm: number; size_b_mm?: number; size_c_mm?: number; notes?: string }
  }>(
    '/lesions/:id/measurements',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['measured_at', 'size_a_mm'],
          properties: {
            measured_at: { type: 'string' },
            size_a_mm: { type: 'number', minimum: 0 },
            size_b_mm: { type: 'number', minimum: 0 },
            size_c_mm: { type: 'number', minimum: 0 },
            notes: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { measured_at, size_a_mm, size_b_mm, size_c_mm, notes } = request.body
      // Расчёт объёма по формуле эллипсоида: V = (π/6) × a × b × c
      let volume_mm3: number | null = null
      const b = size_b_mm ?? size_a_mm
      const c = size_c_mm ?? size_a_mm
      volume_mm3 = (Math.PI / 6) * size_a_mm * b * c

      const [measurement] = await knex('measurements')
        .insert({ lesion_id: request.params.id, measured_at, size_a_mm, size_b_mm, size_c_mm, volume_mm3, notes })
        .returning('*')

      return reply.status(201).send({ data: measurement })
    }
  )

  // GET /lesions/:id/dynamics — VDT и данные для графика
  app.get<{ Params: { id: string } }>('/lesions/:id/dynamics', { preHandler: authenticate }, async (request, reply) => {
    const lesion = await knex('lesions').where({ id: request.params.id }).first()
    if (!lesion) return reply.status(404).send({ message: 'Образование не найдено' })

    const measurements = await knex('measurements')
      .where({ lesion_id: request.params.id })
      .orderBy('measured_at', 'asc')

    let vdt_days: number | null = null
    let growth_percent: number | null = null

    if (measurements.length >= 2) {
      const first = measurements[0]
      const last = measurements[measurements.length - 1]
      const dt = (new Date(last.measured_at).getTime() - new Date(first.measured_at).getTime()) / (1000 * 60 * 60 * 24)
      const d1 = first.size_a_mm
      const d2 = last.size_a_mm
      if (d1 > 0 && d2 > 0 && dt > 0) {
        // VDT = (Δt × ln2) / (3 × ln(D2/D1))
        vdt_days = (dt * Math.LN2) / (3 * Math.log(d2 / d1))
        growth_percent = ((d2 - d1) / d1) * 100
      }
    }

    return { data: { lesion, measurements, vdt_days, growth_percent } }
  })
}
