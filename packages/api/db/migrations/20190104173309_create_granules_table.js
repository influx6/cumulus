'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable(
    'granules',
    (table) => {
      table.bigIncrements('id').primary();

      table.bigInteger('beginningDateTime').unsigned();
      table.string('cmrLink');
      table.integer('duration').unsigned();
      table.bigInteger('endingDateTime').unsigned();
      table.json('error');
      table.string('execution');
      table.string('granuleId').unique().notNullable();
      table.bigInteger('lastUpdateDateTime').unsigned();
      table.bigInteger('processingEndDateTime').unsigned();
      table.bigInteger('processingStartDateTime').unsigned();
      table.integer('productVolume').unsigned();
      table.bigInteger('productionDateTime').unsigned();
      table.boolean('published').defaultTo(false);
      table.enu('status', ['running', 'completed', 'failed']).notNullable();
      table.integer('timeToArchive').unsigned();
      table.integer('timeToPreprocess').unsigned();

      table.integer('collection_id').unsigned().notNullable();
      table.foreign('collection_id').references('collections.id');

      table.bigInteger('pdr_id').unsigned();
      table.foreign('pdr_id').references('pdrs.id');

      table.bigInteger('createdAt').unsigned().notNullable();
      table.bigInteger('updatedAt').unsigned().notNullable();
    }
  );

  await knex.schema.createTable(
    'files',
    (table) => {
      table.bigIncrements('id').primary();

      table.bigInteger('fileSize').unsigned();
      table.string('filename');
      table.string('name');

      table.string('bucket').notNullable();
      table.string('filepath').notNullable();
      table.unique(['bucket', 'filepath']);

      table.bigInteger('createdAt').unsigned().notNullable();
      table.bigInteger('updatedAt').unsigned().notNullable();

      table.bigInteger('granule_id').unsigned().notNullable();
      table.foreign('granule_id').references('granules.id');
    }
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('files');
  await knex.schema.dropTable('granules');
};
