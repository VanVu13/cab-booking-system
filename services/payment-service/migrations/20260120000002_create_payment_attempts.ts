import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('payment_attempts', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('payment_id').notNullable().references('id').inTable('payments').onDelete('CASCADE');
        table.text('status').notNullable();
        table.jsonb('request_payload').nullable();
        table.jsonb('response_payload').nullable();
        table.integer('latency_ms').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

        // Index
        table.index('payment_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('payment_attempts');
}
