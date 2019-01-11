'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const EXECUTIONS_TABLE = 'executions';

function filterExecutionFields(executionRecord) {
  const fields = [
    'arn',
    'collectionId',
    'createdAt',
    'duration',
    'error',
    'execution',
    'finalPayload',
    'name',
    'parentArn',
    'originalPayload',
    'status',
    'timestamp',
    'type',
    'updatedAt'
  ];

  return pick(executionRecord, fields);
}

function deletePayloadsCompletedBefore(db, ms) {
  return db(EXECUTIONS_TABLE)
    .where('updatedAt', '<=', ms)
    .where('status', 'completed')
    .update({
      originalPayload: null,
      finalPayload: null
    });
}

function deletePayloadsNotCompletedBefore(db, ms) {
  return db(EXECUTIONS_TABLE)
    .where('updatedAt', '<=', ms)
    .whereNot('status', 'completed')
    .update({
      originalPayload: null,
      finalPayload: null
    });
}

function find(db, params = {}) {
  let query = db(EXECUTIONS_TABLE);
  if (params.where) query = query.where(params.where);
  if (params.whereNot) query = query.whereNot(params.whereNot);

  return query.select(params.fields);
}

async function findByArn(db, arn) {
  const record = await db(EXECUTIONS_TABLE).first().where({ arn });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, executionRecord) {
  const now = Date.now();

  await db(EXECUTIONS_TABLE)
    .insert({
      createdAt: now,
      ...filterExecutionFields(executionRecord),
      updatedAt: now
    });

  return executionRecord.arn;
}

async function update(db, arn, executionRecord) {
  return db(EXECUTIONS_TABLE)
    .where({ arn })
    .update({
      ...filterExecutionFields(executionRecord),
      arn: undefined,
      createdAt: undefined,
      updatedAt: Date.now()
    });
}

module.exports = {
  deletePayloadsCompletedBefore,
  deletePayloadsNotCompletedBefore,
  find,
  findByArn,
  insert,
  update,
  delete: (db, arn) => db(EXECUTIONS_TABLE).where({ arn }).del()
};
