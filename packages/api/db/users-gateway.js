'use strict';

const pick = require('lodash.pick');

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

function findByUserName(db, userName) {
  return db(USERS_TABLE).first().where({ user_name: userName });
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
