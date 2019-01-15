'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable(
    'users',
    (table) => {
      table.bigIncrements('id').primary();

      table.string('userName').unique();

      table.bigInteger('createdAt').notNullable();
      table.bigInteger('updatedAt').notNullable();
    }
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('users');
};
