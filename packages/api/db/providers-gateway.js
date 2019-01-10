'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const PROVIDERS_TABLE = 'providers';

function filterProviderFields(providerRecord) {
  const fields = [
    'created_at',
    'encrypted',
    'globalConnectionLimit',
    'host',
    'id',
    'meta',
    'password',
    'port',
    'protocol',
    'updated_at',
    'username'
  ];

  return pick(providerRecord, fields);
}

async function findById(db, id) {
  const record = await db(PROVIDERS_TABLE).first().where({ id });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, providerRecord) {
  const now = Date.now();

  const [providerId] = await db(PROVIDERS_TABLE)
    .insert({
      ...filterProviderFields(providerRecord),
      created_at: now,
      updated_at: now
    });

  return providerId;
}

async function update(db, providerId, providerRecord) {
  return db(PROVIDERS_TABLE)
    .where({ id: providerId })
    .update({
      ...filterProviderFields(providerRecord),
      id: undefined,
      created_at: undefined,
      updated_at: Date.now()
    });
}

module.exports = {
  filterProviderFields,
  findById,
  insert,
  update,
  delete: (db, id) => db(PROVIDERS_TABLE).where({ id }).del()
};
