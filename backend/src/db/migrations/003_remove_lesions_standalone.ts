// Образования больше не хранятся отдельно.
// Данные об образованиях живут внутри протоколов (reports.lesions_json).
// Инструменты расчёта (VDT, объём, график) — переиспользуемые утилиты на клиенте.
import type { Knex } from 'knex'

export async function up(_knex: Knex): Promise<void> {
  // Миграция намеренно пустая: таблицы lesions/measurements не создавались в prod.
  // Если они существуют (dev), удаляем их вручную через rollback предыдущей миграции.
}

export async function down(_knex: Knex): Promise<void> {
  // no-op
}
