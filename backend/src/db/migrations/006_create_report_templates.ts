import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('report_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('modality', 20).nullable()   // null = любая модальность
    table.string('region', 100).nullable()    // null = любая область
    table.string('section', 20).notNullable() // 'description' | 'conclusion'
    table.jsonb('keywords').notNullable().defaultTo('[]')
    table.text('text').notNullable()
    table.integer('priority').notNullable().defaultTo(5)
    table.timestamps(true, true)
  })
  await knex.schema.raw(
    'CREATE INDEX idx_templates_modality_section ON report_templates (modality, section)'
  )
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('report_templates')
}
