'use strict';

const pick = require('lodash.pick');

const { RecordDoesNotExist } = require('../lib/errors');

const ACCESS_TOKENS_TABLE = 'access_tokens';

function filterAccessTokenFields(record) {
  const fields = [
    'access_token',
    'created_at',
    'expiration_time',
    'id',
    'refresh_token',
    'updated_at',
    'username'
  ];

  return pick(record, fields);
}

async function findByAccessToken(db, accessToken) {
  const record = await db(ACCESS_TOKENS_TABLE)
    .first()
    .where({ access_token: accessToken });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, record) {
  const now = Date.now();

  const [id] = await db(ACCESS_TOKENS_TABLE)
    .insert({
      ...filterAccessTokenFields(record),
      created_at: now,
      updated_at: now
    });

  return id;
}

async function deleteByAccessToken(db, accessToken) {
  await db(ACCESS_TOKENS_TABLE).where({ access_token: accessToken }).del();
}

module.exports = {
  findByAccessToken,
  insert,
  deleteByAccessToken
};
