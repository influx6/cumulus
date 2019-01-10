'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable(
    'access_tokens',
    (table) => {
      table.bigIncrements('id').primary();

      table.string('accessToken').unique();
      table.bigInteger('expirationTime');
      table.string('refreshToken');
      table.string('username');

      table.bigInteger('createdAt').notNullable();
      table.bigInteger('updatedAt').notNullable();
    }
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('access_tokens');
};
