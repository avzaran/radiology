import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.enum('tier', ['free', 'pro', 'clinic']).notNullable().defaultTo('free')
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('expires_at').nullable() // null = бессрочно (free)
    table.string('payment_provider', 50).nullable() // yukassa, stripe
    table.string('external_id', 255).nullable() // ID в платёжной системе
    table.enum('status', ['active', 'cancelled', 'expired']).notNullable().defaultTo('active')
    table.timestamps(true, true)
  })

  await knex.schema.createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
    table.string('action', 100).notNullable() // create_lesion, delete_report, etc.
    table.string('entity_type', 50).nullable()
    table.uuid('entity_id').nullable()
    table.jsonb('meta').nullable() // дополнительный контекст
    table.string('ip_address', 45).nullable()
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('audit_log')
  await knex.schema.dropTable('subscriptions')
}
