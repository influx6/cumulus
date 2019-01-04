'use strict';

const knex = require('../db/knex');
const Model = require('./Model');
const usersGateway = require('../db/users-gateway');

const { RecordDoesNotExist } = require('../lib/errors');

function userModelToRecord(userModel) {
  return {
    created_at: userModel.createdAt,
    updated_at: userModel.updatedAt,
    user_name: userModel.userName
  };
}

function buildUserModel(userRecord) {
  return {
    createdAt: userRecord.created_at,
    updatedAt: userRecord.updated_at,
    userName: userRecord.user_name
  };
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

    if (!userRecord) throw new RecordDoesNotExist();

    return buildUserModel(userRecord);
  }

  async create(userModel) {
    const { db } = privates.get(this);

    const userRecord = userModelToRecord(userModel);

    await usersGateway.insert(db, userRecord);

    return this.get({ userName: userModel.userName });
  }

  async delete(userName) {
    const { db } = privates.get(this);

    await usersGateway.deleteByUserName(db, userName);
  }
}
module.exports = User;
