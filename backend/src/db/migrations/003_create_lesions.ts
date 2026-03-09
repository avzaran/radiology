import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('lesions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('CASCADE')
    table.string('name', 255).notNullable()
    table.string('type', 100).nullable() // solid, subsolid, ground-glass, etc.
    table.string('location', 255).nullable() // анатомическая локализация
    table.text('description').nullable()
    table.timestamps(true, true)
  })

  await knex.schema.createTable('measurements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('lesion_id').notNullable().references('id').inTable('lesions').onDelete('CASCADE')
    table.date('measured_at').notNullable()
    table.float('size_a_mm').notNullable() // первая ось
    table.float('size_b_mm').nullable() // вторая ось
    table.float('size_c_mm').nullable() // третья ось
    // Объём рассчитывается на клиенте: V = (π/6) × a × b × c
    table.float('volume_mm3').nullable()
    table.text('notes').nullable()
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('measurements')
  await knex.schema.dropTable('lesions')
}
