
exports.up = async (knex) => {
  await knex.schema.createTable(
    'pdrs',
    (table) => {
      table.bigIncrements('id').primary();

      table.string('address');
      table.bigInteger('createdAt').notNullable();
      table.string('execution');
      table.string('origninalUrl');
      table.string('PANmessage');
      table.string('pdrName').notNullable();
      table.boolean('PANsent');
      table.integer('progress').unsigned();
      table.integer('stats_completed').unsigned();
      table.integer('stats_failed').unsigned();
      table.integer('stats_processing').unsigned();
      table.integer('stats_total').unsigned();
      table.enu('status', ['running', 'failed', 'completed']).notNullable();
      table.bigInteger('updatedAt').notNullable();

      table.integer('collection_id').unsigned().notNullable();
      table.foreign('collection_id').references('collections.id');

      table.string('provider').notNullable();
      table.foreign('provider').references('providers.id');
    }
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('pdrs');
};
