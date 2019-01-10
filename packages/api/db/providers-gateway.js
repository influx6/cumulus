'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const PROVIDERS_TABLE = 'providers';

function filterProviderFields(providerRecord) {
  const fields = [
    'createdAt',
    'encrypted',
    'globalConnectionLimit',
    'host',
    'id',
    'meta',
    'password',
    'port',
    'protocol',
    'updatedAt',
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
      createdAt: now,
      updatedAt: now
    });

  return providerId;
}

async function update(db, providerId, providerRecord) {
  return db(PROVIDERS_TABLE)
    .where({ id: providerId })
    .update({
      ...filterProviderFields(providerRecord),
      id: undefined,
      createdAt: undefined,
      updatedAt: Date.now()
    });
}

module.exports = {
  filterProviderFields,
  findById,
  insert,
  update,
  delete: (db, id) => db(PROVIDERS_TABLE).where({ id }).del()
};
