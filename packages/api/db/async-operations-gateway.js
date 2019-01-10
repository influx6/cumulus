'use strict';

const pick = require('lodash.pick');

const { RecordDoesNotExist } = require('../lib/errors');

const ASYNC_OPERATIONS_TABLE = 'async_operations';

function filterAsyncOperationFields(asyncOperationRecord) {
  const fields = [
    'created_at',
    'id',
    'output',
    'status',
    'taskArn',
    'updated_at'
  ];

  return pick(asyncOperationRecord, fields);
}

async function findById(db, id) {
  const record = await db(ASYNC_OPERATIONS_TABLE).first().where({ id });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, asyncOperationRecord) {
  const now = Date.now();

  const [asyncOperationId] = await db(ASYNC_OPERATIONS_TABLE)
    .insert({
      ...filterAsyncOperationFields(asyncOperationRecord),
      created_at: now,
      updated_at: now
    });

  return asyncOperationId;
}

function update(db, id, asyncOperationRecord) {
  return db(ASYNC_OPERATIONS_TABLE)
    .where({ id })
    .update({
      ...filterAsyncOperationFields(asyncOperationRecord),
      id: undefined,
      created_at: undefined,
      updated_at: Date.now()
    });
}

module.exports = {
  findById,
  insert,
  update
};
