import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('payments', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.text('ride_id').notNullable().unique();
        table.text('user_id').notNullable();
        table.bigInteger('amount').notNullable();
        table.text('currency').notNullable();
        table.text('method').notNullable();
        table.text('provider').notNullable();
        table.text('provider_payment_id').nullable();
        table.text('status').notNullable().defaultTo('INITIATED');
        table.text('failure_code').nullable();
        table.text('failure_message').nullable();
        table.text('idempotency_key').notNullable().unique();
        table.integer('attempt_count').notNullable().defaultTo(0);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

        // Indexes
        table.index('status');
        table.index('created_at');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('payments');
}
