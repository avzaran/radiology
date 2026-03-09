import * as dotenv from 'dotenv'
dotenv.config({ path: '../.env' })

import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'

import { registerAuth } from './plugins/auth'
import { authRoutes } from './routes/auth'
import { patientRoutes } from './routes/patients'
import { scaleRoutes } from './routes/scales'
import { reportRoutes } from './routes/reports'
import { templateRoutes } from './routes/templates'

async function main() {
  const app = Fastify({ logger: true })

  // ─── Плагины безопасности ────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    credentials: true,
  })
  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? 'dev_secret_change_in_production',
  })

  // ─── Auth-декоратор ───────────────────────────────────────────
  await registerAuth(app)

  // ─── Маршруты ────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(patientRoutes, { prefix: '/api' })
  await app.register(scaleRoutes, { prefix: '/api' })
  await app.register(reportRoutes, { prefix: '/api' })
  await app.register(templateRoutes, { prefix: '/api' })

  // ─── Старт ───────────────────────────────────────────────────
  const PORT = Number(process.env['PORT'] ?? 4000)

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Backend запущен: http://localhost:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
