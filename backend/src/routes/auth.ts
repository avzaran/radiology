import type { FastifyInstance } from 'fastify'
import knex from '../db/knex'
import crypto from 'crypto'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post<{
    Body: { email: string; password: string; full_name?: string }
  }>(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            full_name: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, full_name } = request.body
      const existing = await knex('users').where({ email }).first()
      if (existing) {
        return reply.status(409).send({ message: 'Email уже зарегистрирован' })
      }

      const [user] = await knex('users')
        .insert({ email, password_hash: hashPassword(password), full_name })
        .returning(['id', 'email', 'role', 'subscription_tier'])

      const token = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role, subscription_tier: user.subscription_tier },
        { expiresIn: '15m' }
      )
      const refresh_token = app.jwt.sign({ id: user.id }, { expiresIn: '30d' })

      return reply.status(201).send({ data: { user, access_token: token, refresh_token } })
    }
  )

  // POST /auth/login
  app.post<{
    Body: { email: string; password: string }
  }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body
      const user = await knex('users').where({ email, password_hash: hashPassword(password) }).first()

      if (!user) {
        return reply.status(401).send({ message: 'Неверный email или пароль' })
      }

      const token = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role, subscription_tier: user.subscription_tier },
        { expiresIn: '15m' }
      )
      const refresh_token = app.jwt.sign({ id: user.id }, { expiresIn: '30d' })

      return reply.send({ data: { user: { id: user.id, email: user.email, role: user.role }, access_token: token, refresh_token } })
    }
  )

  // POST /auth/refresh
  app.post<{ Body: { refresh_token: string } }>(
    '/refresh',
    { schema: { body: { type: 'object', required: ['refresh_token'], properties: { refresh_token: { type: 'string' } } } } },
    async (request, reply) => {
      try {
        const payload = app.jwt.verify<{ id: string }>(request.body.refresh_token)
        const user = await knex('users').where({ id: payload.id }).first()
        if (!user) return reply.status(401).send({ message: 'Пользователь не найден' })

        const token = app.jwt.sign(
          { id: user.id, email: user.email, role: user.role, subscription_tier: user.subscription_tier },
          { expiresIn: '15m' }
        )
        return reply.send({ data: { access_token: token } })
      } catch {
        return reply.status(401).send({ message: 'Невалидный refresh token' })
      }
    }
  )
}
