'use strict';

const pick = require('lodash.pick');

const FILES_TABLE = 'files';

function filterFileFields(fileRecord) {
  const fields = [
    'bucket',
    'created_at',
    'file_size',
    'filename',
    'granule_id',
    'id',
    'key',
    'name',
    'updated_at'
  ];

  return pick(fileRecord, fields);
}

function findByGranuleId(db, granuleId) {
  return db(FILES_TABLE).select().where({ granule_id: granuleId });
}

async function insertMany(db, fileRecords) {
  const now = Date.now();

  const records = fileRecords.map((record) => ({
    ...filterFileFields(record),
    created_at: now,
    updated_at: now
  }));

  await db(FILES_TABLE)
    .insert(records);
}

async function deleteByGranuleDbId(db, granuleId) {
  await db(FILES_TABLE).where({ granule_id: granuleId }).del();
}

module.exports = {
  findByGranuleId,
  insertMany,
  deleteByGranuleDbId
};
