'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const USERS_TABLE = 'users';

function filterUserFields(userRecord) {
  const fields = [
    'createdAt',
    'id',
    'updatedAt',
    'userName'
  ];

  return pick(userRecord, fields);
}

async function findByUserName(db, userName) {
  const record = await db(USERS_TABLE).first().where({ userName });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, providerRecord) {
  const now = Date.now();

  const [providerId] = await db(USERS_TABLE)
    .insert({
      ...filterUserFields(providerRecord),
      createdAt: now,
      updatedAt: now
    });

  return providerId;
}

async function deleteByUserName(db, userName) {
  await db(USERS_TABLE).where({ userName }).del();
}

module.exports = {
  findByUserName,
  insert,
  deleteByUserName
};
