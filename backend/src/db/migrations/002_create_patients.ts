import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('patients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    // Псевдонимизация: без ФИО, только псевдоним и год рождения
    table.string('pseudonym', 100).notNullable()
    table.integer('birth_year').nullable()
    table.enum('sex', ['male', 'female', 'unknown']).notNullable().defaultTo('unknown')
    table.text('notes').nullable()
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('patients')
}
