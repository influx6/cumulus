'use strict';

const pickBy = require('lodash.pickby');
const { isNotNull } = require('@cumulus/common/util');

const knex = require('../db/knex');
const Model = require('./Model');
const accessTokensGateway = require('../db/access-tokens-gateway');

const { RecordDoesNotExist } = require('../lib/errors');

const privates = new WeakMap();

class AccessToken extends Model {
  constructor() {
    super();

    privates.set(this, { db: knex() });
  }

  async get({ accessToken }) {
    const { db } = privates.get(this);

    const record = await accessTokensGateway.findByAccessToken(db, accessToken);

    const model = { ...record, id: undefined };

    return pickBy(model, isNotNull);
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

    await accessTokensGateway.insert(db, accessTokenModel);

    return this.get({ accessToken: accessTokenModel.accessToken });
  }

  async delete({ accessToken }) {
    const { db } = privates.get(this);

    await accessTokensGateway.deleteByAccessToken(db, accessToken);
  }
}
module.exports = AccessToken;
