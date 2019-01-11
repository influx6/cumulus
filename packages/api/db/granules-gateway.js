'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const GRANULES_TABLE = 'granules';

function filterGranuleFields(granuleRecord) {
  const fields = [
    'beginningDateTime',
    'cmrLink',
    'collection_id',
    'createdAt',
    'duration',
    'endingDateTime',
    'error',
    'execution',
    'granuleId',
    'id',
    'lastUpdateDateTime',
    'pdr_id',
    'processingEndDateTime',
    'productVolume',
    'productionDateTime',
    'published',
    'status',
    'timeToArchive',
    'timeToPreprocess',
    'updatedAt'
  ];

  return pick(granuleRecord, fields);
}

async function findByGranuleId(db, granuleId) {
  const record = await db(GRANULES_TABLE)
    .first()
    .where({ granuleId });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

function find(db) {
  return db(GRANULES_TABLE).select();
}

async function insert(db, granuleRecord) {
  const now = Date.now();

  const [id] = await db(GRANULES_TABLE)
    .insert({
      ...filterGranuleFields(granuleRecord),
      createdAt: now,
      updatedAt: now
    });

  return id;
}

function update(db, id, granuleRecord) {
  return db(GRANULES_TABLE)
    .where({ id })
    .update({
      ...filterGranuleFields(granuleRecord),
      id: undefined,
      createdAt: undefined,
      updatedAt: Date.now()
    });
}

// async function deleteByUserName(db, userName) {
//   await db(GRANULES_TABLE).where({ user_name: userName }).del();
// }

module.exports = {
  findByGranuleId,
  find,
  insert,
  update,
  delete: (db, id) => db(GRANULES_TABLE).where({ id }).del()
};
