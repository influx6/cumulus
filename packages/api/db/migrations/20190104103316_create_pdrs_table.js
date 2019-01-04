
exports.up = async (knex) => {
  await knex.schema.createTable(
    'pdrs',
    (table) => {
      table.bigIncrements('id').primary();

      table.string('address');
      table.bigInteger('created_at').notNullable();
      table.string('execution');
      table.string('original_url');
      table.string('pan_message');
      table.string('pdr_name').notNullable();
      table.boolean('pan_sent');
      table.integer('progress').unsigned();
      table.integer('stats_completed').unsigned();
      table.integer('stats_failed').unsigned();
      table.integer('stats_processing').unsigned();
      table.integer('stats_total').unsigned();
      table.enu('status', ['running', 'failed', 'completed']).notNullable();
      table.bigInteger('updated_at').notNullable();
      table.string('workflow');

      table.integer('collection_id').unsigned().notNullable();
      table.foreign('collection_id').references('collections.id');

      table.string('provider_id').notNullable();
      table.foreign('provider_id').references('providers.id');
    }
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('pdrs');
};
