'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const USERS_TABLE = 'users';

function filterUserFields(userRecord) {
  const fields = [
    'created_at',
    'id',
    'updated_at',
    'user_name'
  ];

  return pick(userRecord, fields);
}

async function findByUserName(db, userName) {
  const record = await db(USERS_TABLE).first().where({ user_name: userName });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, providerRecord) {
  const now = Date.now();

  const [providerId] = await db(USERS_TABLE)
    .insert({
      ...filterUserFields(providerRecord),
      created_at: now,
      updated_at: now
    });

  return providerId;
}

async function deleteByUserName(db, userName) {
  await db(USERS_TABLE).where({ user_name: userName }).del();
}

module.exports = {
  findByUserName,
  insert,
  deleteByUserName
};
