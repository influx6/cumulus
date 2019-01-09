'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const GRANULES_TABLE = 'granules';

function filterGranuleFields(granuleRecord) {
  const fields = [
    'beginning_date_time',
    'cmr_link',
    'collection_id',
    'created_at',
    'duration',
    'ending_date_time',
    'error',
    'execution_url',
    'granule_id',
    'granule_id',
    'id',
    'last_update_date_time',
    'pdr_id',
    'processing_end_date_time',
    'product_volume',
    'production_date_time',
    'published',
    'status',
    'time_to_archive',
    'time_to_preprocess',
    'updated_at'
  ];

  return pick(granuleRecord, fields);
}

async function findByGranuleId(db, granuleId) {
  const record = await db(GRANULES_TABLE)
    .first()
    .where({ granule_id: granuleId });

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
      created_at: now,
      updated_at: now
    });

  return id;
}

function update(db, id, granuleRecord) {
  return db(GRANULES_TABLE)
    .where({ id })
    .update({
      ...filterGranuleFields(granuleRecord),
      id: undefined,
      created_at: undefined,
      updated_at: Date.now()
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
