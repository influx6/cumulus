'use strict';

const pickBy = require('lodash.pickby');
const { isNotNull } = require('@cumulus/common/util');

const knex = require('../db/knex');
const Model = require('./Model');
const usersGateway = require('../db/users-gateway');

function buildUserModel(record) {
  const model = {
    ...record,
    id: undefined
  };

  return pickBy(model, isNotNull);
}

const privates = new WeakMap();

class User extends Model {
  constructor() {
    super();

    privates.set(this, { db: knex() });
  }

  async get({ userName }) {
    const { db } = privates.get(this);

    const userRecord = await usersGateway.findByUserName(db, userName);

    return buildUserModel(userRecord);
  }

  async create(userModel) {
    const { db } = privates.get(this);

    await usersGateway.insert(db, userModel);

    return this.get({ userName: userModel.userName });
  }

  async delete(userName) {
    const { db } = privates.get(this);

    await usersGateway.deleteByUserName(db, userName);
  }
}
module.exports = User;
