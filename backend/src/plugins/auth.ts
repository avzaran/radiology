import type { FastifyInstance, FastifyRequest } from 'fastify'

// Расширяем типы Fastify — добавляем authenticate
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
  }
}

// Декоратор для защищённых маршрутов
export async function registerAuth(app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest) => {
    await request.jwtVerify()
  })
}

// Проверка тарифного плана
export function requireTier(minTier: 'free' | 'pro' | 'clinic') {
  const tierOrder = { free: 0, pro: 1, clinic: 2 }

  return async (request: FastifyRequest) => {
    await request.jwtVerify()
    const user = request.user as { subscription_tier: string }
    const userTier = (user.subscription_tier ?? 'free') as keyof typeof tierOrder
    if (tierOrder[userTier] < tierOrder[minTier]) {
      throw { statusCode: 403, message: "Requires " + minTier + " tier or higher" }
    }
  }
}
