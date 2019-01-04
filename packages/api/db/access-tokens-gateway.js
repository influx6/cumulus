'use strict';

const pick = require('lodash.pick');

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

function findByAccessToken(db, accessToken) {
  return db(ACCESS_TOKENS_TABLE).first().where({ access_token: accessToken });
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
