'use strict';

const { DynamoDbScanQueue } = require('@cumulus/common/aws');
const { filterProviderFields } = require('../providers-gateway');

function dynamoRecordToDbRecord(dynamoRecord) {
  const dbRecord = filterProviderFields(dynamoRecord);

  if (dynamoRecord.meta) {
    dbRecord.meta = JSON.stringify(dynamoRecord.meta);
  }

  return dbRecord;
}

exports.up = async (knex) => {
  await knex.schema.createTable(
    'providers',
    (table) => {
      table.string('id').primary().notNull();

      table.bigInteger('created_at').notNullable();
      table.bigInteger('updated_at').notNullable();

      table.integer('globalConnectionLimit').notNull();
      table.text('host').notNull();
      table.enu(
        'protocol',
        ['http', 'https', 'ftp', 'sftp', 's3']
      ).notNull();
      table.integer('port');
      table.string('username', 1000);
      table.string('password', 1000);
      table.boolean('encrypted');
      table.json('meta');
    }
  );

  if (process.env.ProvidersTable) {
    const dynamoDbScanQueue = new DynamoDbScanQueue({
      TableName: process.env.ProvidersTable
    });
    const dynamoRecords = [];

    /* eslint-disable no-await-in-loop */
    while (await dynamoDbScanQueue.peek()) {
      dynamoRecords.push(await dynamoDbScanQueue.shift());
    }
    /* eslint-enable no-await-in-loop */

    const records = dynamoRecords.map(dynamoRecordToDbRecord);

    await knex('providers').insert(records);
  }
};

exports.down = (knex) => knex.schema.dropTable('providers');
