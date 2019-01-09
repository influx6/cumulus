'use strict';

const knex = require('../db/knex');
const Model = require('./Model');
const accessTokensGateway = require('../db/access-tokens-gateway');

const { RecordDoesNotExist } = require('../lib/errors');

function accessTokenModelToRecord(model) {
  return {
    access_token: model.accessToken,
    created_at: model.createdAt,
    expiration_time: model.expirationTime,
    refresh_token: model.refreshToken,
    updated_at: model.updatedAt,
    username: model.username
  };
}

function buildAccessTokenModel(record) {
  return {
    accessToken: record.access_token,
    createdAt: record.created_at,
    expirationTime: record.expiration_time || undefined,
    refreshToken: record.refresh_token,
    updatedAt: record.updated_at,
    username: record.username || undefined
  };
}

const privates = new WeakMap();

class AccessToken extends Model {
  constructor() {
    super();

    privates.set(this, { db: knex() });
  }

  async get({ accessToken }) {
    const { db } = privates.get(this);

    const accessTokenRecord = await accessTokensGateway.findByAccessToken(db, accessToken);

    return buildAccessTokenModel(accessTokenRecord);
  }

  async exists({ accessToken }) {
    const { db } = privates.get(this);

    try {
      await accessTokensGateway.findByAccessToken(db, accessToken);

      return true;
    }
    catch (err) {
      if (err instanceof RecordDoesNotExist) return false;

      throw err;
    }
  }

  async create(accessTokenModel) {
    const { db } = privates.get(this);

    const accessTokenRecord = accessTokenModelToRecord(accessTokenModel);

    await accessTokensGateway.insert(db, accessTokenRecord);

    return this.get({ accessToken: accessTokenModel.accessToken });
  }

  async delete({ accessToken }) {
    const { db } = privates.get(this);

    await accessTokensGateway.deleteByAccessToken(db, accessToken);
  }
}
module.exports = AccessToken;
