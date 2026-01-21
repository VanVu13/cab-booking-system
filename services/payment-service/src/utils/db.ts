import knex, { Knex } from 'knex';
import config from '../config/database';

let db: Knex | null = null;

export const getDb = (): Knex => {
    if (!db) {
        db = knex(config);
    }
    return db;
};

export const closeDb = async (): Promise<void> => {
    if (db) {
        await db.destroy();
        db = null;
    }
};

export default getDb;
