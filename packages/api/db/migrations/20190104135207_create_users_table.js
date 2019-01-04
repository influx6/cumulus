'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable(
    'users',
    (table) => {
      table.bigIncrements('id').primary();

      table.string('user_name').unique();

      table.bigInteger('created_at').notNullable();
      table.bigInteger('updated_at').notNullable();
    }
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('users');
};
