import test from 'ava';
import { Collection, ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import TestDataSet from './datasets/users';
import { DBManager, User } from './util';
import {ExpectedResults, createMaskingValuesCollection } from './datasets/expected-results';
import * as fs from 'fs';

let dbManager: DBManager;

const logObj = (input: any) => {
  console.log(JSON.stringify(input));
};

test.before('Setup Database', t => {
  dbManager = new DBManager();
  return dbManager.start();
});

/**
 * TODO: Figure out way to set up context for multiple tests
 * Determine that environment is correctly setup and Tyranid correctly configured
 */
test.serial('Collection sould have all user entries', async t => {
  const user = await User.findAll({ query: {}, count: true});
  const isValid = user.count === TestDataSet.length;

  t.true(isValid, 'Could not access test data');
});

test.serial('Should be able to retrieve document by explicit collection or byName', async t => {
  const user = await User.findOne({ query: {} });
  const user2 = await Tyr.byName.user.findOne({ query: {} });

  const isValid = (JSON.stringify(user) === JSON.stringify(user2));

  t.true(isValid, 'Could not retrieve same objects by Collection.findOne & Tyr.byName.Collection.findOne');
});

test.serial('Field Definition should save encryptable flag', async t => {
  const user = await User.findOne({ query: {} });
  const userFields = user.$model.def.fields;
  const isObfuscateable = userFields.lastName.def.obfuscateable;
  const isNotObfuscateable = userFields.createdAt.def.hasOwnProperty('obfuscateable');

  t.true(isObfuscateable, 'Does not have obfuscateable flag, extending FieldInstance definition failed. ');
  t.false(isNotObfuscateable, 'Non-obfuscateable field has flag set to true');
});

test('Should have obfuscate function on Tyr namespace', t => {
  const valid = Tyr.obfuscate && typeof Tyr.obfuscate === 'function';
  t.true(valid, 'Tyranid namespace does not have obfuscate function');
});

/**
 * Test Obfuscation
 */
    //TODO:
    //TEST Array, complext data types

test.serial('Should copy obfuscateable data to temp collection', async t => {
  const copyResultCollection = new Tyr.Collection({
    id: '_c1',
    name: 'copypasta',
    dbName: 'copypasta',
    internal: false,
    fields: {
      _id: { is: 'mongoid' },
      firstName: { is: 'string' },
      lastName: { is: 'string' },
      ip_address: { is: 'string'}
    }
  });
  const query = { _id: { $lte: 10 } }; // Copy first ten records
  await Tyr.copyObfuscateableData(query, Tyr.byName.user, copyResultCollection);
  const copiedData = (await copyResultCollection.findAll({ query: {  } }));
  t.deepEqual(JSON.stringify(copiedData), ExpectedResults.CopiedObfuscateableData, 'Obfuscateable data incorrectly copied to new collection');
});

test.serial('Should obfuscate first ten users and replace with static values', async t => {
  const numberToAffect = 10;
  const maskValues = { firstName: 'USER', lastName: 'x', ip_address: '0.0.0.0' };
  const query = { _id: { $lte: numberToAffect } };
  const opts: Tyr.ObfuscateBatchOpts = {
    query: query,
    collection: User,
    replacementValues: {
      'firstName': maskValues.firstName,
      'lastName': maskValues.lastName,
      'ip_address': maskValues.ip_address
    }
  };
  const batchResults: Tyr.ObfuscateBatchResult = await Tyr.obfuscate(opts);
  t.true((batchResults.count === numberToAffect), 'Incorrect number of records obfuscated');
  const alteredRecordsPointer = await User.find({ query: query });
  const alteredRecords = await (alteredRecordsPointer).toArray();
  t.deepEqual(JSON.stringify(alteredRecords), ExpectedResults.MaskPIIWithStaticValues, 'Result PII fields not blank as expected');

  // Validate MetaData
  const metaDataCollection: Collection<Tyr.ObfuscateMetaDataSchema> = await Tyr.db.collection(User.def.dbName + '__meta');

  t.true((metaDataCollection !== null && metaDataCollection !== undefined), 'Could not locate metadata collection for User');

  const metaRecords = await (await metaDataCollection.find({ batchTag: batchResults.batchTag })).toArray();

  let r: Tyr.ObfuscateMetaDataSchema;
  // Not sure how to mock mongo's ObjectID() so cannot do a exact dataset comparison
  for (let i = 0; i < metaRecords.length; i++) {
    r = metaRecords[i];

    //Not quite sure how to get id to string
    t.deepEqual(JSON.stringify(r.recordId), ((i + 1) + ''), 'metadata has incorrect associated record id');
    t.deepEqual(JSON.stringify(r.fields), '["firstName","lastName","ip_address"]', 'metadata has incorrectly saved which fields were obfuscated');
    //Technically this shouldn't happen
    t.deepEqual(r.batchTag, batchResults.batchTag, 'Incorrect batch tag');
  }

});

// test.serial('Should use collection to mask data', async t => {
//   const maskCollection = await createMaskingValuesCollection();
//   const query = { _id: { $in: [11, 12, 13, 14, 15] }};

//   const opts: Tyr.ObfuscateBatchOpts = {
//     query: query,
//     collection: User,
//     replacementValCollection: maskCollection
//   };

//   const batchResults: Tyr.ObfuscateBatchResult = await Tyr.obfuscate(opts);

//   /** Validate obfuscation */
//   const alteredRecordsPointer = await User.find({ query: query });
//   const alteredRecords = await (alteredRecordsPointer).toArray();
//   t.deepEqual(JSON.stringify(alteredRecords), ExpectedResults.MaskPIIWithCollectionValues, 'Result PII fields not migrated from given collection');

//   /** Validate meta data */
//   const metaDataCollection: Collection<Tyr.ObfuscateMetaDataSchema> = await Tyr.db.collection(User.def.dbName + '__meta');

//   t.true((metaDataCollection !== null && metaDataCollection !== undefined), 'Could not locate metadata collection for User');

//   const metaRecords = await (await metaDataCollection.find({ batchTag: batchResults.batchTag })).toArray();

//   let r: Tyr.ObfuscateMetaDataSchema;
//   // Not sure how to mock mongo's ObjectID() so cannot do a exact dataset comparison
//   for (let i = 0; i < metaRecords.length; i++) {
//     r = metaRecords[i];

//     //Not quite sure how to get id to string
//     t.deepEqual(JSON.stringify(r.recordId), ((i + 11) + ''), 'metadata has incorrect associated record id');
//     t.deepEqual(JSON.stringify(r.fields), '["firstName","lastName","ip_address"]', 'metadata has incorrectly saved which fields were obfuscated');
//     //Technically this shouldn't happen
//     t.deepEqual(r.batchTag, batchResults.batchTag, 'Incorrect batch tag');
//   }
// });

// test('Should be able to export, obfuscate, then re-import data', async t => {
//   t.fail('TBD: Implement');
// });

test.after('Shut down server', t => {
  return dbManager.stop();
});
