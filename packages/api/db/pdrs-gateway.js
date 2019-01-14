'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const PDRS_TABLE = 'pdrs';

function filterPdrFields(record) {
  const fields = [
    'address',
    'collection_id',
    'createdAt',
    'execution',
    'originalUrl',
    'PANmessage',
    'PANsent',
    'pdrName',
    'progress',
    'provider',
    'stats_completed',
    'stats_failed',
    'stats_processing',
    'stats_total',
    'status',
    'updatedAt'
  ];

  return pick(record, fields);
}

async function findByPdrName(db, pdrName) {
  const record = await db(PDRS_TABLE).first().where({ pdrName });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, record) {
  const now = Date.now();

  const [id] = await db(PDRS_TABLE)
    .insert({
      ...filterPdrFields(record),
      createdAt: now,
      updatedAt: now
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
      createdAt: undefined,
      updatedAt: Date.now()
    });
}

module.exports = {
  findByPdrName,
  insert,
  update,
  delete: (db, pdrName) => db(PDRS_TABLE).where({ pdrName }).del()
};
