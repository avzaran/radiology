import type { FastifyInstance } from 'fastify'
import knex from '../db/knex'

export async function statisticsRoutes(app: FastifyInstance) {
  const authenticate = app.authenticate.bind(app)

  // GET /api/statistics/summary
  app.get('/statistics/summary', { preHandler: authenticate }, async (request) => {
    const user = request.user as { id: string }
    const uid = user.id

    const [
      [{ count: patients }],
      [{ count: reports }],
      [{ count: scaleResults }],
      [{ count: reportsThisMonth }],
      byModality,
      byScale,
    ] = await Promise.all([
      knex('patients').where({ user_id: uid }).count('id as count'),
      knex('reports').where({ user_id: uid }).count('id as count'),
      knex('scale_results').where({ user_id: uid }).count('id as count'),
      knex('reports')
        .where({ user_id: uid })
        .where('created_at', '>=', knex.raw("date_trunc('month', NOW())"))
        .count('id as count'),
      knex('reports').where({ user_id: uid }).select('modality').count('id as count').groupBy('modality'),
      knex('scale_results').where({ user_id: uid }).select('scale_type').count('id as count').groupBy('scale_type'),
    ])

    const modalityMap: Record<string, number> = {}
    for (const row of byModality as { modality: string; count: string }[]) {
      modalityMap[row.modality] = Number(row.count)
    }

    const scaleMap: Record<string, number> = {}
    for (const row of byScale as { scale_type: string; count: string }[]) {
      scaleMap[row.scale_type] = Number(row.count)
    }

    return {
      data: {
        patients: Number(patients),
        reports: Number(reports),
        scale_results: Number(scaleResults),
        reports_this_month: Number(reportsThisMonth),
        by_modality: modalityMap,
        by_scale: scaleMap,
      },
    }
  })

  // GET /api/statistics/recent — последние 5 протоколов
  app.get('/statistics/recent', { preHandler: authenticate }, async (request) => {
    const user = request.user as { id: string }

    const rows = await knex('reports as r')
      .leftJoin('patients as p', 'r.patient_id', 'p.id')
      .where('r.user_id', user.id)
      .select('r.id', 'r.modality', 'r.region', 'r.created_at', 'p.pseudonym as patient_name')
      .orderBy('r.created_at', 'desc')
      .limit(5)

    return { data: rows }
  })
}
