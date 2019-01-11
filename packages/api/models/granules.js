'use strict';

const clonedeep = require('lodash.clonedeep');
const get = require('lodash.get');
const path = require('path');
const pickBy = require('lodash.pickby');
const pMap = require('p-map');
const uniqBy = require('lodash.uniqby');
const aws = require('@cumulus/ingest/aws');
const commonAws = require('@cumulus/common/aws');
const { isNotNil } = require('@cumulus/common/util');
const cmrjs = require('@cumulus/cmrjs');
const { CMR } = require('@cumulus/cmrjs');
const log = require('@cumulus/common/log');
const { DefaultProvider } = require('@cumulus/common/key-pair-provider');
const {
  generateMoveFileParams,
  moveGranuleFiles
} = require('@cumulus/ingest/granule');
const { constructCollectionId } = require('@cumulus/common');
const { describeExecution } = require('@cumulus/common/step-functions');

const knex = require('../db/knex');
const Model = require('./Model');
const collectionsGateway = require('../db/collections-gateway');
const filesGateway = require('../db/files-gateway');
const granulesGateway = require('../db/granules-gateway');
const pdrsGateway = require('../db/pdrs-gateway');

const {
  parseException,
  deconstructCollectionId,
  getGranuleProductVolume,
  extractDate
} = require('../lib/utils');
const Rule = require('./rules');

function fileRecordToModel(record) {
  const model = {
    ...record,
    id: undefined
  };

  return pickBy(model, isNotNil);
}

function buildFileRecords(granuleDbId, fileModels = []) {
  return fileModels.map((fileModel) => ({
    ...fileModel,
    granule_id: granuleDbId
  }));
}

function granuleModelToRecord(granuleModel, collectionId, pdrId) {
  const record = {
    ...granuleModel,
    error: undefined,
    collection_id: collectionId,
    pdr_id: pdrId
  };

  if (granuleModel.error) {
    record.error = JSON.stringify(granuleModel.error);
  }

  return record;
}

function buildGranuleModel(params = {}) {
  const {
    granuleRecord,
    collectionName,
    collectionVersion,
    pdrName,
    fileModels
  } = params;

  const model = {
    ...granuleRecord,
    id: undefined,
    pdrName,
    collectionId: `${collectionName}___${collectionVersion}`,
    files: fileModels
  };

  return pickBy(model, isNotNil);
}

async function insertGranuleModel(db, granuleModel) {
  const [
    collectionName,
    collectionVersion
  ] = granuleModel.collectionId.split('___');

  const collectionRecord = await collectionsGateway.findByNameAndVersion(
    db,
    collectionName,
    collectionVersion
  );

  let pdrId = null;
  if (granuleModel.pdrName) {
    const pdrRecord = await pdrsGateway.findByPdrName(
      db,
      granuleModel.pdrName
    );

    pdrId = pdrRecord.id;
  }

  const granuleRecord = granuleModelToRecord(
    granuleModel,
    collectionRecord.id,
    pdrId
  );

  return db.transaction(async (trx) => {
    const granuleDbId = await granulesGateway.insert(trx, granuleRecord);

    const fileRecords = buildFileRecords(granuleDbId, granuleModel.files);

    await filesGateway.insertMany(trx, fileRecords);

    return granuleDbId;
  });
}

async function updateGranuleModel(db, updatedModel) {
  const granuleRecord = await granulesGateway.findByGranuleId(
    db,
    updatedModel.granuleId
  );

  let collectionId;
  if (updatedModel.collectionId) {
    const [
      collectionName,
      collectionVersion
    ] = updatedModel.collectionId.split('___');

    const collectionRecord = await collectionsGateway.findByNameAndVersion(
      db,
      collectionName,
      collectionVersion
    );

    collectionId = collectionRecord.id;
  }

  let pdrId;
  if (updatedModel.pdrName) {
    const pdrRecord = await pdrsGateway.findByPdrName(db, updatedModel.pdrName);
    pdrId = pdrRecord.id;
  }

  return db.transaction(async (trx) => {
    await filesGateway.deleteByGranuleDbId(trx, granuleRecord.id);
    const fileRecords = buildFileRecords(granuleRecord.id, updatedModel.files);
    await filesGateway.insertMany(trx, fileRecords);

    const updatedGranuleRecord = granuleModelToRecord(updatedModel, collectionId, pdrId);
    await granulesGateway.update(trx, granuleRecord.id, updatedGranuleRecord);
  });
}

const privates = new WeakMap();

class Granule extends Model {
  constructor() {
    super();

    privates.set(this, { db: knex() });
  }

  async get({ granuleId }) {
    const { db } = privates.get(this);

    const granuleRecord = await granulesGateway.findByGranuleId(db, granuleId);

    const collectionRecord = await collectionsGateway.findById(
      db,
      granuleRecord.collection_id
    );

    let pdrName;
    if (granuleRecord.pdr_id) {
      const pdrRecord = await pdrsGateway.findById(db, granuleRecord.pdr_id);
      pdrName = pdrRecord.pdr_name;
    }

    const fileRecords = await filesGateway.findByGranuleId(
      db,
      granuleRecord.id
    );

    const fileModels = fileRecords.map(fileRecordToModel);

    const granuleModel = buildGranuleModel({
      granuleRecord,
      collectionName: collectionRecord.name,
      collectionVersion: collectionRecord.version,
      pdrName,
      fileModels
    });

    return granuleModel;
  }

  async getAll() {
    const { db } = privates.get(this);

    const granuleRecords = await granulesGateway.find(db);

    return pMap(
      granuleRecords,
      (granuleRecord) => this.get({ granuleId: granuleRecord.granule_id })
    );
  }

  async create(granuleModel) {
    const { db } = privates.get(this);

    await insertGranuleModel(db, granuleModel);

    return this.get({ granuleId: granuleModel.granuleId });
  }

  async update({ granuleId }, updates = {}, fieldsToDelete = []) {
    const { db } = privates.get(this);

    const deletions = {};
    fieldsToDelete.forEach((f) => {
      deletions[f] = null;
    });

    const updatedModel = {
      ...updates,
      ...deletions,
      granuleId
    };

    await updateGranuleModel(db, updatedModel);

    return this.get({ granuleId });
  }

  async delete({ granuleId }) {
    const { db } = privates.get(this);

    const granuleRecord = await granulesGateway.findByGranuleId(db, granuleId);

    return db.transaction(async (trx) => {
      await filesGateway.deleteByGranuleDbId(trx, granuleRecord.id);
      await granulesGateway.delete(trx, granuleRecord.id);
    });
  }

  async deleteAll() {
    const { db } = privates.get(this);

    const granuleRecords = await granulesGateway.find(db);

    return pMap(
      granuleRecords,
      (granuleRecord) => this.delete({ granuleId: granuleRecord.granule_id })
    );
  }

  /**
  * Adds fileSize values from S3 object metadata for granules missing that information
  *
  * @param {Array<Object>} files - Array of files from a payload granule object
  * @returns {Promise<Array>} - Updated array of files with missing fileSize appended
  */
  addMissingFileSizes(files) {
    const filePromises = files.map((file) => {
      if (!('fileSize' in file)) {
        return commonAws.headObject(file.bucket, file.filepath)
          .then((result) => {
            const updatedFile = file;
            updatedFile.fileSize = result.ContentLength;
            return updatedFile;
          })
          .catch((error) => {
            log.error(`Error: ${error}`);
            log.error(`Could not validate missing filesize for s3://${file.filename}`);

            return file;
          });
      }
      return Promise.resolve(file);
    });
    return Promise.all(filePromises);
  }

  /**
   * Removes a give granule from CMR
   *
   * @param {string} granuleId - the granule ID
   * @param {string} collectionId - the collection ID
   * @returns {Promise<undefined>} - undefined
   */
  async removeGranuleFromCmr(granuleId, collectionId) {
    log.info(`granules.removeGranuleFromCmr ${granuleId}`);
    const password = await DefaultProvider.decrypt(process.env.cmr_password);
    const cmr = new CMR(
      process.env.cmr_provider,
      process.env.cmr_client_id,
      process.env.cmr_username,
      password
    );

    await cmr.deleteGranule(granuleId, collectionId);
    await this.update({ granuleId }, { published: false, cmrLink: null });
  }

  /**
   * start the re-ingest of a given granule object
   *
   * @param {Object} granuleModel - the granule object
   * @returns {Promise<undefined>} - undefined
   */
  async reingest(granuleModel) {
    const { db } = privates.get(this);

    const executionArn = path.basename(granuleModel.execution);

    const executionDescription = await describeExecution(executionArn);
    const originalMessage = JSON.parse(executionDescription.input);

    const { name, version } = deconstructCollectionId(granuleModel.collectionId);

    const lambdaPayload = await Rule.buildPayload({
      workflow: originalMessage.meta.workflow_name,
      meta: originalMessage.meta,
      cumulus_meta: {
        cumulus_context: {
          reingestGranule: true,
          forceDuplicateOverwrite: true
        }
      },
      payload: originalMessage.payload,
      provider: granuleModel.provider,
      collection: {
        name,
        version
      }
    });

    const granuleRecord = await granulesGateway.findByGranuleId(
      db,
      granuleModel.granuleId
    );

    await granulesGateway.update(db, granuleRecord.id, { status: 'running' });

    return aws.invoke(process.env.invoke, lambdaPayload);
  }

  /**
   * apply a workflow to a given granule object
   *
   * @param {Object} granuleModel - the granule object
   * @param {string} workflow - the workflow name
   * @returns {Promise<undefined>} undefined
   */
  async applyWorkflow(granuleModel, workflow) {
    const { db } = privates.get(this);

    const { name, version } = deconstructCollectionId(granuleModel.collectionId);

    const lambdaPayload = await Rule.buildPayload({
      workflow,
      payload: {
        granules: [granuleModel]
      },
      provider: granuleModel.provider,
      collection: {
        name,
        version
      }
    });

    const granuleRecord = await granulesGateway.findByGranuleId(
      db,
      granuleModel.granuleId
    );

    await granulesGateway.update(db, granuleRecord.id, { status: 'running' });

    await aws.invoke(process.env.invoke, lambdaPayload);
  }

  /**
   * Move a granule's files to destination locations specified
   *
   * @param {Object} g - the granule object
   * @param {Array<{regex: string, bucket: string, filepath: string}>} destinations
   * - list of destinations specified
   *    regex - regex for matching filepath of file to new destination
   *    bucket - aws bucket of the destination
   *    filepath - file path/directory on the bucket for the destination
   * @param {string} distEndpoint - distribution endpoint
   * @returns {Promise<undefined>} undefined
   */
  async move(g, destinations, distEndpoint) {
    log.info(`granules.move ${g.granuleId}`);
    const files = clonedeep(g.files);
    await moveGranuleFiles(g.granuleId, files, destinations, distEndpoint, g.published);
    await this.update({ granuleId: g.granuleId }, { files: files });
  }

  /**
   * With the params for moving a granule, return the files that already exist at
   * the move location
   *
   * @param {Object} granule - the granule object
   * @param {Array<{regex: string, bucket: string, filepath: string}>} destinations
   * - list of destinations specified
   *    regex - regex for matching filepath of file to new destination
   *    bucket - aws bucket of the destination
   *    filepath - file path/directory on the bucket for the destination
   * @returns {Promise<Array<Object>>} - promise that resolves to a list of files
   * that already exist at the destination that they would be written to if they
   * were to be moved via the move granules call
   */
  async getFilesExistingAtLocation(granule, destinations) {
    const moveFileParams = generateMoveFileParams(granule.files, destinations);

    const fileExistsPromises = moveFileParams.map(async (moveFileParam) => {
      const { target, file } = moveFileParam;
      if (target) {
        const exists = await commonAws.fileExists(target.Bucket, target.Key);

        if (exists) {
          return Promise.resolve(file);
        }
      }

      return Promise.resolve();
    });

    const existingFiles = await Promise.all(fileExistsPromises);

    return existingFiles.filter((file) => file);
  }

  /**
   * Create new granule records from incoming sns messages
   *
   * @param {Object} payload - sns message containing the output of a Cumulus Step Function
   * @returns {Promise<Array>} granule records
   */
  async createGranulesFromSns(payload) {
    const name = get(payload, 'cumulus_meta.execution_name');
    const granules = get(payload, 'payload.granules', get(payload, 'meta.input_granules'));

    if (!granules) return Promise.resolve();

    const arn = aws.getExecutionArn(
      get(payload, 'cumulus_meta.state_machine'),
      name
    );

    if (!arn) return Promise.resolve();

    const execution = aws.getExecutionUrl(arn);

    const collection = get(payload, 'meta.collection');
    const exception = parseException(payload.exception);

    const collectionId = constructCollectionId(collection.name, collection.version);

    const done = granules.map(async (g) => {
      if (g.granuleId) {
        let granuleFiles = g.files;
        granuleFiles = await this.addMissingFileSizes(uniqBy(g.files, 'filename'));

        const doc = {
          granuleId: g.granuleId,
          pdrName: get(payload, 'meta.pdr.name'),
          collectionId,
          status: get(payload, 'meta.status'),
          provider: get(payload, 'meta.provider.id'),
          execution,
          cmrLink: get(g, 'cmrLink'),
          files: granuleFiles,
          error: exception,
          createdAt: get(payload, 'cumulus_meta.workflow_start_time'),
          timestamp: Date.now(),
          productVolume: getGranuleProductVolume(g.files),
          timeToPreprocess: get(payload, 'meta.sync_granule_duration', 0) / 1000,
          timeToArchive: get(payload, 'meta.post_to_cmr_duration', 0) / 1000,
          processingStartDateTime: extractDate(payload, 'meta.sync_granule_end_time'),
          processingEndDateTime: extractDate(payload, 'meta.post_to_cmr_start_time')
        };

        doc.published = get(g, 'published', false);
        // Duration is also used as timeToXfer for the EMS report
        doc.duration = (doc.timestamp - doc.createdAt) / 1000;

        if (g.cmrLink) {
          const metadata = await cmrjs.getMetadata(g.cmrLink);
          doc.beginningDateTime = metadata.time_start;
          doc.endingDateTime = metadata.time_end;
          doc.lastUpdateDateTime = metadata.updated;

          const fullMetadata = await cmrjs.getFullMetadata(g.cmrLink);
          if (fullMetadata && fullMetadata.DataGranule) {
            doc.productionDateTime = fullMetadata.DataGranule.ProductionDateTime;
          }
        }

        return this.create(doc);
      }
      return Promise.resolve();
    });

    return Promise.all(done);
  }
}

module.exports = Granule;
