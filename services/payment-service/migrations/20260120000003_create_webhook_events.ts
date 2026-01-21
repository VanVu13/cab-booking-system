import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('webhook_events', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.text('provider').notNullable();
        table.text('event_id').notNullable();
        table.boolean('signature_valid').notNullable();
        table.jsonb('payload').notNullable();
        table.timestamp('processed_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

        // Unique constraint for idempotency
        table.unique(['provider', 'event_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('webhook_events');
}
