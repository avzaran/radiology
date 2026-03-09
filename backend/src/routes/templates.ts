import type { FastifyInstance } from 'fastify'
import db from '../db/knex'

interface TemplatesQuery {
  modality?: string
  region?: string
  section?: string
}

export async function templateRoutes(app: FastifyInstance) {
  // GET /api/templates?modality=ct&region=...&section=description
  app.get<{ Querystring: TemplatesQuery }>(
    '/templates',
    { onRequest: [app.authenticate] },
    async (req) => {
      const { modality, region, section } = req.query

      const query = db('report_templates').orderBy('priority', 'desc')

      if (modality) {
        query.where(function () {
          this.where('modality', modality).orWhereNull('modality')
        })
      }
      if (region) {
        query.where(function () {
          this.where('region', region).orWhereNull('region')
        })
      }
      if (section) {
        query.where('section', section)
      }

      return query.select('id', 'modality', 'region', 'section', 'keywords', 'text', 'priority')
    }
  )
}
