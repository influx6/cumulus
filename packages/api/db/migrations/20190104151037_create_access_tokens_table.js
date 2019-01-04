'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable(
    'access_tokens',
    (table) => {
      table.bigIncrements('id').primary();

      table.string('access_token').unique();
      table.bigInteger('expiration_time');
      table.string('refresh_token');
      table.string('username');

      table.bigInteger('created_at').notNullable();
      table.bigInteger('updated_at').notNullable();
    }
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('access_tokens');
};
