'use strict';

const get = require('lodash.get');
const set = require('lodash.set');
const pvl = require('@cumulus/pvl');
const aws = require('@cumulus/ingest/aws');

const { constructCollectionId } = require('@cumulus/common');
const { isNotNil } = require('@cumulus/common/util');

const knex = require('../db/knex');
const collectionsGateway = require('../db/collections-gateway');
const pdrsGateway = require('../db/pdrs-gateway');
const Model = require('./Model');

function pdrModelToRecord(model, collectionId) {
  return {
    ...model,
    collection_id: collectionId,
    stats_completed: get(model, 'stats.completed'),
    stats_failed: get(model, 'stats.failed'),
    stats_processing: get(model, 'stats.processing'),
    stats_total: get(model, 'stats.total')
  };
}

function buildPdrModel(pdrRecord, collectionRecord) {
  const model = {
    ...pdrRecord,
    collectionId: `${collectionRecord.name}___${collectionRecord.version}`,
    collection_id: undefined,
    stats: undefined
  };

  if (isNotNil(pdrRecord.stats_completed)) {
    set(model, 'stats.completed', pdrRecord.stats_completed);
  }

  if (isNotNil(pdrRecord.stats_failed)) {
    set(model, 'stats.failed', pdrRecord.stats_failed);
  }

  if (isNotNil(pdrRecord.stats_processing)) {
    set(model, 'stats.processing', pdrRecord.stats_processing);
  }

  if (isNotNil(pdrRecord.stats_total)) {
    set(model, 'stats.total', pdrRecord.stats_total);
  }

  return model;
}

const privates = new WeakMap();

class Pdr extends Model {
  constructor() {
    super();

    privates.set(this, { db: knex() });
  }

  async get({ pdrName }) {
    const { db } = privates.get(this);

    const pdrRecord = await pdrsGateway.findByPdrName(db, pdrName);

    const collectionRecord = await collectionsGateway.findById(
      db,
      pdrRecord.collection_id
    );

    return buildPdrModel(pdrRecord, collectionRecord);
  }

  async create(pdrModel) {
    const { db } = privates.get(this);

    const [
      collectionName,
      collectionVersion
    ] = pdrModel.collectionId.split('___');

    const collectionRecord = await collectionsGateway.findByNameAndVersion(
      db,
      collectionName,
      collectionVersion
    );

    if (!collectionRecord) {
      throw new Error(`Collection not found: ${collectionName}.${collectionVersion}`);
    }

    const pdrRecord = pdrModelToRecord(pdrModel, collectionRecord.id);

    await pdrsGateway.insert(db, pdrRecord);

    return this.get({ pdrName: pdrModel.pdrName });
  }

  async update({ pdrName }, item, keysToDelete = []) {
    const { db } = privates.get(this);

    const deletions = {};
    keysToDelete.forEach((f) => {
      deletions[f] = null;
    });

    const updatedModel = {
      ...item,
      ...deletions,
      id: undefined
    };

    const updates = pdrModelToRecord(updatedModel);

    await pdrsGateway.update(db, pdrName, updates);

    return this.get({ pdrName });
  }

  async delete({ pdrName }) {
    const { db } = privates.get(this);

    await pdrsGateway.delete(db, pdrName);
  }

  /**
   * Generate PAN message
   *
   * @returns {string} the PAN message
   */
  static generatePAN() {
    return pvl.jsToPVL(
      new pvl.models.PVLRoot()
        .add('MESSAGE_TYPE', new pvl.models.PVLTextString('SHORTPAN'))
        .add('DISPOSITION', new pvl.models.PVLTextString('SUCCESSFUL'))
        .add('TIME_STAMP', new pvl.models.PVLDateTime(new Date()))
    );
  }

  /**
   * Generate a PDRD message with a given err
   *
   * @param {Object} err - the error object
   * @returns {string} the PDRD message
   */
  static generatePDRD(err) {
    return pvl.jsToPVL(
      new pvl.models.PVLRoot()
        .add('MESSAGE_TYPE', new pvl.models.PVLTextString('SHORTPDRD'))
        .add('DISPOSITION', new pvl.models.PVLTextString(err.message))
    );
  }

  /**
   * Create a new pdr record from incoming sns messages
   *
   * @param {Object} payload - sns message containing the output of a Cumulus Step Function
   * @returns {Promise<Object>} a pdr record
   */
  createPdrFromSns(payload) {
    const name = get(payload, 'cumulus_meta.execution_name');
    const pdrObj = get(payload, 'payload.pdr', get(payload, 'meta.pdr'));
    const pdrName = get(pdrObj, 'name');

    if (!pdrName) return Promise.resolve();

    const arn = aws.getExecutionArn(
      get(payload, 'cumulus_meta.state_machine'),
      name
    );
    const execution = aws.getExecutionUrl(arn);

    const collection = get(payload, 'meta.collection');
    const collectionId = constructCollectionId(collection.name, collection.version);

    const stats = {
      processing: get(payload, 'payload.running', []).length,
      completed: get(payload, 'payload.completed', []).length,
      failed: get(payload, 'payload.failed', []).length
    };

    stats.total = stats.processing + stats.completed + stats.failed;
    let progress = 0;
    if (stats.processing > 0 && stats.total > 0) {
      progress = ((stats.total - stats.processing) / stats.total) * 100;
    }
    else if (stats.processing === 0 && stats.total > 0) {
      progress = 100;
    }

    const doc = {
      pdrName,
      collectionId,
      status: get(payload, 'meta.status'),
      provider: get(payload, 'meta.provider.id'),
      progress,
      execution,
      PANSent: get(pdrObj, 'PANSent', false),
      PANmessage: get(pdrObj, 'PANmessage', 'N/A'),
      stats,
      createdAt: get(payload, 'cumulus_meta.workflow_start_time'),
      timestamp: Date.now()
    };

    doc.duration = (doc.timestamp - doc.createdAt) / 1000;

    return this.create(doc);
  }
}

module.exports = Pdr;
