'use strict';

const pickBy = require('lodash.pickby');
const { CollectionConfigStore } = require('@cumulus/common');
const { isNotNull } = require('@cumulus/common/util');

const { AssociatedRulesError, RecordDoesNotExist } = require('../lib/errors');
const Model = require('./Model');
const knex = require('../db/knex');

const collectionsGateway = require('../db/collections-gateway');
const rulesGateway = require('../db/rules-gateway');
const tagsGateway = require('../db/tags-gateway');

function buildCollectionRecord(model) {
  const record = {
    ...model,
    files: undefined,
    meta: undefined
  };

  if (model.meta) {
    record.meta = JSON.stringify(model.meta);
  }

  return record;
}

function buildCollectionModel(collectionRecord, fileDefinitionModels, tags) {
  return {
    ...collectionRecord,
    files: fileDefinitionModels,
    tags
  };
}

function buildCollectionFileDefinitionRecords(collectionId, collectionModel) {
  const files = collectionModel.files || [];

  return files.map((file) => ({
    ...file,
    collection_id: collectionId
  }));
}

function insertCollectionModel(db, collectionModel) {
  return db.transaction(async (trx) => {
    const collectionRecord = buildCollectionRecord(collectionModel);

    const collectionId = await collectionsGateway.insert(trx, collectionRecord);

    const fileDefinitionRecords = buildCollectionFileDefinitionRecords(
      collectionId,
      collectionModel
    );

    await collectionsGateway.setFileDefinitions(
      trx,
      collectionId,
      fileDefinitionRecords
    );

    await tagsGateway.setCollectionTags(db, collectionId, collectionModel.tags);

    return collectionId;
  });
}

async function updateCollectionModel(db, collectionModel) {
  const { id: collectionId } = await collectionsGateway.findByNameAndVersion(
    db,
    collectionModel.name,
    collectionModel.version
  );

  return db.transaction(async (trx) => {
    await tagsGateway.setCollectionTags(trx, collectionId, collectionModel.tags);

    const fileRecords = buildCollectionFileDefinitionRecords(
      collectionId,
      collectionModel
    );
    await collectionsGateway.setFileDefinitions(trx, collectionId, fileRecords);

    const updates = buildCollectionRecord(collectionModel);
    await collectionsGateway.update(trx, collectionId, updates);
  });
}

function buildCollectionConfigStore() {
  return new CollectionConfigStore(
    process.env.internal,
    process.env.stackName
  );
}

function storeCollectionConfig(collectionModel) {
  const dataType = collectionModel.dataType || collectionModel.name;

  const collectionConfigStore = buildCollectionConfigStore();

  return collectionConfigStore.put(
    dataType,
    collectionModel.version,
    collectionModel
  );
}

const privates = new WeakMap();

class Collection extends Model {
  constructor() {
    super();

    privates.set(this, { db: knex() });
  }

  async get({ name, version }) {
    const { db } = privates.get(this);

    const collectionRecord = await collectionsGateway.findByNameAndVersion(
      db,
      name,
      version
    );

    const fileDefinitionRecords = await collectionsGateway.getFileDefinitions(
      db,
      collectionRecord.id
    );

    const tags = await tagsGateway.getCollectionTags(db, collectionRecord.id);

    const model = buildCollectionModel(
      collectionRecord,
      fileDefinitionRecords,
      tags
    );

    return pickBy(model, isNotNull);
  }

  async exists(name, version) {
    const { db } = privates.get(this);

    try {
      await collectionsGateway.findByNameAndVersion(
        db,
        name,
        version
      );

      return true;
    }
    catch (err) {
      if (err instanceof RecordDoesNotExist) return false;

      throw err;
    }
  }

  async create(item) {
    const { db } = privates.get(this);

    await storeCollectionConfig(item);

    await insertCollectionModel(db, item);

    return this.get({ name: item.name, version: item.version });
  }

  async update({ name, version }, updates = {}, fieldsToDelete = []) {
    const { db } = privates.get(this);

    const deletions = {};
    fieldsToDelete.forEach((f) => {
      deletions[f] = null;
    });

    const updatedModel = {
      ...updates,
      ...deletions,
      name: name,
      version: version
    };

    await updateCollectionModel(db, updatedModel);

    return this.get({ name, version });
  }

  // TODO This is not deleting the config from the collection config store
  async delete({ name, version }) {
    const { db } = privates.get(this);

    const {
      id: collectionId
    } = await collectionsGateway.findByNameAndVersion(db, name, version);

    const rules = await rulesGateway.findByCollectionId(db, collectionId);

    if (rules.length > 0) {
      throw new AssociatedRulesError(
        'Cannot delete a collection that has associated rules',
        rules.map((r) => r.name)
      );
    }

    return db.transaction(async (trx) => {
      await tagsGateway.deleteCollectionTags(trx, collectionId);
      await collectionsGateway.deleteFileDefinitions(trx, collectionId);
      await collectionsGateway.delete(trx, collectionId);
    });
  }
}
module.exports = Collection;
