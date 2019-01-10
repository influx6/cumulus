'use strict';

const pick = require('lodash.pick');
const { RecordDoesNotExist } = require('../lib/errors');

const COLLECTIONS_TABLE = 'collections';
const COLLECTION_FILES_TABLE = 'collection_files';

function filterCollectionFields(collectionRecord) {
  const fields = [
    'createdAt',
    'dataType',
    'duplicateHandling',
    'granuleIdExtraction',
    'granuleId',
    'id',
    'meta',
    'name',
    'process',
    'provider_path',
    'sampleFileName',
    'updatedAt',
    'url_path',
    'version'
  ];

  return pick(collectionRecord, fields);
}

function filterCollectionFileDefinitionFields(fileDefinitionRecord) {
  const fields = [
    'bucket',
    'collection_id',
    'id',
    'regex',
    'sampleFileName',
    'url_path'
  ];

  return pick(fileDefinitionRecord, fields);
}

async function findById(db, id) {
  const record = await db(COLLECTIONS_TABLE).first().where({ id });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function findByNameAndVersion(db, name, version) {
  const record = await db(COLLECTIONS_TABLE).first().where({ name, version });

  if (!record) throw new RecordDoesNotExist();

  return record;
}

async function insert(db, collectionRecord) {
  const now = Date.now();

  const [collectionId] = await db(COLLECTIONS_TABLE)
    .insert({
      ...filterCollectionFields(collectionRecord),
      createdAt: now,
      updatedAt: now
    });

  return collectionId;
}

function update(db, collectionId, collectionRecord) {
  return db(COLLECTIONS_TABLE)
    .where({ id: collectionId })
    .update({
      ...filterCollectionFields(collectionRecord),
      id: undefined,
      createdAt: undefined,
      updatedAt: Date.now()
    });
}

function insertCollectionFileDefinitions(db, records) {
  return db(COLLECTION_FILES_TABLE)
    .insert(records.map(filterCollectionFileDefinitionFields));
}

function deleteFileDefinitions(db, collectionId) {
  return db(COLLECTION_FILES_TABLE)
    .where({ collection_id: collectionId })
    .del();
}

function getFileDefinitions(db, collectionId) {
  return db(COLLECTION_FILES_TABLE)
    .where({ collection_id: collectionId });
}

function setFileDefinitions(db, collectionId, fileDefinitions) {
  return db.transaction(async (trx) => {
    await deleteFileDefinitions(trx, collectionId);
    await insertCollectionFileDefinitions(trx, fileDefinitions);
  });
}

module.exports = {
  findById,
  findByNameAndVersion,
  insert,
  update,
  delete: (db, id) => db(COLLECTIONS_TABLE).where({ id }).del(),
  getFileDefinitions,
  setFileDefinitions,
  deleteFileDefinitions
};
