import type { FastifyInstance } from 'fastify'
import knex from '../db/knex'

// Конфигурации шкал — хранятся на бэкенде, отдаются на клиент для офлайн-кеша
const SCALE_CONFIGS: Record<string, object> = {
  tirads: { name: 'ACR TI-RADS', version: '2017' },
  fleischner: { name: 'Fleischner Society', version: '2017' },
  birads: { name: 'ACR BI-RADS', version: '5' },
  lungrads: { name: 'ACR Lung-RADS', version: '1.1' },
}

export async function scaleRoutes(app: FastifyInstance) {
  const authenticate = app.authenticate.bind(app)

  // GET /scales/:type/config — конфигурация шкалы
  app.get<{ Params: { type: string } }>('/scales/:type/config', async (request, reply) => {
    const config = SCALE_CONFIGS[request.params.type]
    if (!config) return reply.status(404).send({ message: 'Шкала не найдена' })
    return { data: config }
  })

  // POST /scales/:type/calculate — серверная валидация расчёта (логика на клиенте, сервер только сохраняет)
  app.post<{
    Params: { type: string }
    Body: { input_json: Record<string, unknown>; score: string; result: string; patient_id?: string; lesion_id?: string }
  }>(
    '/scales/:type/calculate',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['input_json', 'score', 'result'],
          properties: {
            input_json: { type: 'object' },
            score: { type: 'string' },
            result: { type: 'string' },
            patient_id: { type: 'string' },
            lesion_id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!SCALE_CONFIGS[request.params.type]) {
        return reply.status(404).send({ message: 'Шкала не найдена' })
      }
      const user = request.user as { id: string }
      const [saved] = await knex('scale_results')
        .insert({
          user_id: user.id,
          scale_type: request.params.type,
          ...request.body,
        })
        .returning('*')
      return reply.status(201).send({ data: saved })
    }
  )
}
