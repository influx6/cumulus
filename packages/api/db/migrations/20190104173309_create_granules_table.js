'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable(
    'granules',
    (table) => {
      table.bigIncrements('id').primary();

      table.bigInteger('beginning_date_time').unsigned();
      table.string('cmr_link');
      table.integer('duration').unsigned();
      table.bigInteger('ending_date_time').unsigned();
      table.json('error');
      table.string('execution_url');
      table.string('granule_id').unique().notNullable();
      table.bigInteger('last_update_date_time').unsigned();
      table.bigInteger('processing_end_date_time').unsigned();
      table.bigInteger('processing_start_date_time').unsigned();
      table.integer('product_volume').unsigned();
      table.bigInteger('production_date_time').unsigned();
      table.boolean('published').defaultTo(false);
      table.enu('status', ['running', 'completed', 'failed']).notNullable();
      table.integer('time_to_archive').unsigned();
      table.integer('time_to_preprocess').unsigned();

      table.integer('collection_id').unsigned().notNullable();
      table.foreign('collection_id').references('collections.id');

      table.bigInteger('pdr_id').unsigned();
      table.foreign('pdr_id').references('pdrs.id');

      table.bigInteger('created_at').unsigned().notNullable();
      table.bigInteger('updated_at').unsigned().notNullable();
    }
  );

  await knex.schema.createTable(
    'files',
    (table) => {
      table.bigIncrements('id').primary();

      table.bigInteger('file_size').unsigned();
      table.string('filename');
      table.string('name');

      table.string('bucket').notNullable();
      table.string('key').notNullable();
      table.unique(['bucket', 'key']);

      table.bigInteger('created_at').unsigned().notNullable();
      table.bigInteger('updated_at').unsigned().notNullable();

      table.bigInteger('granule_id').unsigned().notNullable();
      table.foreign('granule_id').references('granules.id');
    }
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('files');
  await knex.schema.dropTable('granules');
};
