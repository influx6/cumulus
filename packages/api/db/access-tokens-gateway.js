'use strict';

const pick = require('lodash.pick');

const { RecordDoesNotExist } = require('../lib/errors');

const ACCESS_TOKENS_TABLE = 'access_tokens';

function filterAccessTokenFields(record) {
  const fields = [
    'accessToken',
    'createdAt',
    'expirationTime',
    'id',
    'refreshToken',
    'updatedAt',
    'username'
  ];

  return pick(record, fields);
}

async function findByAccessToken(db, accessToken) {
  const record = await db(ACCESS_TOKENS_TABLE)
    .first()
    .where({ accessToken });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, record) {
  const now = Date.now();

  const [id] = await db(ACCESS_TOKENS_TABLE)
    .insert({
      ...filterAccessTokenFields(record),
      createdAt: now,
      updatedAt: now
    });

  return id;
}

async function deleteByAccessToken(db, accessToken) {
  await db(ACCESS_TOKENS_TABLE).where({ accessToken }).del();
}

module.exports = {
  findByAccessToken,
  insert,
  deleteByAccessToken
};
