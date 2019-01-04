'use strict';

const get = require('lodash.get');
const set = require('lodash.set');
const pvl = require('@cumulus/pvl');
const aws = require('@cumulus/ingest/aws');

const { constructCollectionId } = require('@cumulus/common');

const knex = require('../db/knex');
const collectionsGateway = require('../db/collections-gateway');
const pdrsGateway = require('../db/pdrs-gateway');
const Model = require('./Model');

const { RecordDoesNotExist } = require('../lib/errors');

function pdrModelToRecord(model, collectionId) {
  return {
    address: model.address,
    collection_id: collectionId,
    created_at: model.createdAt,
    execution: model.execution,
    original_url: model.originalUrl,
    pan_message: model.PANmessage,
    pan_sent: model.PANsent,
    pdr_name: model.pdrName,
    progress: model.progress,
    provider_id: model.provider,
    stats_completed: get(model, 'stats.completed'),
    stats_failed: get(model, 'stats.failed'),
    stats_processing: get(model, 'stats.processing'),
    stats_total: get(model, 'stats.total'),
    status: model.status,
    updated_at: model.updatedAt
  };
}

function buildPdrModel(pdrRecord, collectionRecord) {
  const pdrModel = {
    address: pdrRecord.address,
    collectionId: `${collectionRecord.name}___${collectionRecord.version}`,
    createdAt: pdrRecord.created_at,
    execution: pdrRecord.execution,
    originalUrl: pdrRecord.original_url,
    PANmessage: pdrRecord.pan_message,
    PANsent: pdrRecord.pan_sent,
    pdrName: pdrRecord.pdr_name,
    progress: pdrRecord.progress,
    status: pdrRecord.status,
    updatedAt: pdrRecord.updated_at
  };

  if (pdrRecord.stats_completed) {
    set(pdrModel, 'stats.completed', pdrRecord.stats_completed);
  }

  if (pdrRecord.stats_failed) {
    set(pdrModel, 'stats.failed', pdrRecord.stats_failed);
  }

  if (pdrRecord.stats_processing) {
    set(pdrModel, 'stats.processing', pdrRecord.stats_processing);
  }

  if (pdrRecord.stats_total) {
    set(pdrModel, 'stats.total', pdrRecord.stats_total);
  }

  return pdrModel;
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

    if (pdrRecord === undefined) throw new RecordDoesNotExist();

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
