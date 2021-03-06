'use strict';

const test = require('ava');

const BucketsConfig = require('../BucketsConfig');

const bucketConfig = {
  private: { type: 'private', name: 'a-private-bucket' },
  public: { type: 'public', name: 'a-public-bucket' },
  protected: { type: 'protected', name: 'a-protected-bucket' },
  shared: { type: 'shared', name: 'a-shared-bucket' },
  internal: { type: 'internal', name: 'an-internal-bucket' }
};

test('bucket keys are found by bucketName', (t) => {
  const bucketName = 'a-protected-bucket';
  const Bucket = new BucketsConfig(bucketConfig);
  const expected = 'protected';

  const actual = Bucket.key(bucketName);

  t.is(actual, expected);
});

test('throws error if bucket missing from bucketsConfig', (t) => {
  const missingBucketName = 'does-not-exist';
  const Bucket = new BucketsConfig(bucketConfig);
  const theError = t.throws(() => Bucket.bucket(missingBucketName));
  t.regex(theError.message, /bucketName does-not-exist/);
});

test('throws error if try to get type of non-existing bucket', (t) => {
  const missingBucketName = 'does-not-exist';
  const Bucket = new BucketsConfig(bucketConfig);
  const theError = t.throws(() => Bucket.type(missingBucketName));
  t.regex(theError.message, /bucketName does-not-exist/);
});

test('bucket types are found by bucketName', (t) => {
  const bucketName = 'a-shared-bucket';
  const Bucket = new BucketsConfig(bucketConfig);
  const expected = 'shared';

  const actual = Bucket.type(bucketName);

  t.is(actual, expected);
});

test('bucket object are found by bucketName', (t) => {
  const bucketName = 'an-internal-bucket';
  const Bucket = new BucketsConfig(bucketConfig);
  const expected = {
    type: 'internal',
    name: 'an-internal-bucket'
  };

  const actual = Bucket.bucket(bucketName);

  t.deepEqual(actual, expected);
});


test('checks a bucket existence in config', (t) => {
  const existsName = 'a-public-bucket';
  const doesNotExistName = 'not-included-bucket';
  const Bucket = new BucketsConfig(bucketConfig);

  t.truthy(Bucket.exists(existsName));
  t.falsy(Bucket.exists(doesNotExistName));
});

test('checks a bucket key\'s existence in config', (t) => {
  const existsKey = 'internal';
  const doesNotExistKey = 'not-included-key';
  const Bucket = new BucketsConfig(bucketConfig);

  t.truthy(Bucket.keyExists(existsKey));
  t.falsy(Bucket.keyExists(doesNotExistKey));
});
