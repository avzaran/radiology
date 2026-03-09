import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('email', 255).notNullable().unique()
    table.string('password_hash', 255).nullable() // null если используется Supabase Auth
    table.enum('role', ['doctor', 'head', 'admin']).notNullable().defaultTo('doctor')
    table.string('full_name', 255).nullable()
    table.uuid('clinic_id').nullable()
    table.enum('subscription_tier', ['free', 'pro', 'clinic']).notNullable().defaultTo('free')
    table.boolean('totp_enabled').notNullable().defaultTo(false)
    table.string('totp_secret', 255).nullable()
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}
