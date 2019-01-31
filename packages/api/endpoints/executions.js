'use strict';

const router = require('express-promise-router')();
const models = require('../models');
const { RecordDoesNotExist } = require('../lib/errors');


/**
 * List and search executions
 *
 * @param {Object} req - express request object
 * @param {Object} res - express response object
 * @returns {Promise<Object>} the promise of express response object
 */
async function list(req, res) {
  const instance = new models.Execution();
  const result = await instance.search(req.query);
  return res.send(result);
}

/**
 * get a single execution
 *
 * @param {Object} req - express request object
 * @param {Object} res - express response object
 * @returns {Promise<Object>} the promise of express response object
 */
async function get(req, res) {
  const arn = req.params.arn;

  const e = new models.Execution();

  try {
    const response = await e.get({ arn });
    return res.send(response);
  }
  catch (err) {
    if (err instanceof RecordDoesNotExist) {
      return res.boom.notFound(`No record found for ${arn}`);
    }
    throw err;
  }
}

router.get('/:arn', get);
router.get('/', list);

module.exports = router;
