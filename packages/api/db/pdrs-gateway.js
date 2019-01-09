'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const PDRS_TABLE = 'pdrs';

function filterPdrFields(record) {
  const fields = [
    'address',
    'collection_id',
    'created_at',
    'execution',
    'original_url',
    'pan_message',
    'pan_sent',
    'pdr_name',
    'progress',
    'provider_id',
    'stats_completed',
    'stats_failed',
    'stats_processing',
    'stats_total',
    'status',
    'updated_at',
    'workflow'
  ];

  return pick(record, fields);
}

async function findByPdrName(db, pdrName) {
  const record = await db(PDRS_TABLE).first().where({ pdr_name: pdrName });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, record) {
  const now = Date.now();

  const [id] = await db(PDRS_TABLE)
    .insert({
      ...filterPdrFields(record),
      created_at: now,
      updated_at: now
    });

  return id;
}

function update(db, pdrName, record) {
  return db(PDRS_TABLE)
    .where({ pdrName })
    .update({
      ...filterPdrFields(record),
      id: undefined,
      pdrName: undefined,
      created_at: undefined,
      updated_at: Date.now()
    });
}

module.exports = {
  findByPdrName,
  insert,
  update,
  delete: (db, pdrName) => db(PDRS_TABLE).where({ pdr_name: pdrName }).del()
};
