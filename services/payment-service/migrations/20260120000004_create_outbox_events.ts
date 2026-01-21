import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('outbox_events', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.text('aggregate_type').notNullable();
        table.uuid('aggregate_id').notNullable();
        table.text('type').notNullable();
        table.jsonb('payload').notNullable();
        table.text('status').notNullable().defaultTo('PENDING');
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('published_at').nullable();

        // Index for efficient polling
        table.index(['status', 'created_at']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('outbox_events');
}
