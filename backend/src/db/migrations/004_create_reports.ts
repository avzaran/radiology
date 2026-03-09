import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.uuid('patient_id').nullable().references('id').inTable('patients').onDelete('SET NULL')
    table.enum('modality', ['ct', 'mri', 'xray', 'us', 'mammography']).notNullable().defaultTo('ct')
    table.string('region', 255).nullable()
    table.boolean('contrast').notNullable().defaultTo(false)
    table.text('description').nullable()   // описательная часть (свободный текст)
    table.text('conclusion').nullable()    // заключение
    table.text('content').nullable()       // итоговый сгенерированный текст протокола
    table.string('template_id', 100).nullable()
    // Структурированные данные об образованиях внутри протокола.
    // Каждый элемент: { name, location, size_a, size_b?, size_c?, scale_type?, score? }
    table.jsonb('lesions_json').nullable().defaultTo('[]')
    table.timestamps(true, true)
  })

  await knex.schema.createTable('scale_results', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.uuid('patient_id').nullable().references('id').inTable('patients').onDelete('SET NULL')
    // report_id: результат шкалы можно привязать к конкретному протоколу
    table.uuid('report_id').nullable().references('id').inTable('reports').onDelete('SET NULL')
    table.string('scale_type', 50).notNullable()
    table.jsonb('input_json').notNullable()
    table.string('score', 50).nullable()
    table.text('result').nullable()
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('scale_results')
  await knex.schema.dropTable('reports')
}
