/// <reference path="./typings/tyranid-extensions.d.ts" />

import { Tyr } from "tyranid";
import { Cursor, Collection, FilterQuery, BulkWriteResult, UpdateWriteOpResult, UnorderedBulkOperation } from "mongodb";
import { Timestamp, ObjectId, ObjectID } from 'bson';
import { AesUtil } from './encryptor';
import { emit } from "cluster";

const defaultBatchSize = 500;
const idOnlyProjection = { _id: 1 };
interface IdRecord {
  _id: ObjectID
}
interface FieldObject {
  [name: string]: string;
}

/**
 * TODO: Really large Document support with GridFS API
 */
Tyr.obfuscate = async (opts: Tyr.ObfuscateBatchOpts): Promise<Tyr.ObfuscateBatchResult> => {
  const { collection, query, replacementValues, replacementValCollection, metadataSuffix } = opts;

  const sourceCollectionName: string = collection.def.dbName;
  const mongoSrcCollection: Collection = Tyr.db.collection(sourceCollectionName);

  // Complicated extending Tyr.Collection to have configurable name
  // Going with convention for now
  const metaCollecName = `${sourceCollectionName}${metadataSuffix}`;
  const metaDataCollection: Collection = await getMetaDataCollection(metaCollecName);
  
  const obfsctFields = obfuscateableFieldsFromCollection(collection);

  return await createBatchMetaData(obfsctFields, mongoSrcCollection, metaDataCollection, query, replacementValues, replacementValCollection);
};

//TBD: Maybe part out to an internal Tyr collection to collection migration fn
//TBD: Error handling
Tyr.copyObfuscateableData = async (query: Tyr.MongoQuery, sourceCollection: Tyr.CollectionInstance, targetCollection: Tyr.CollectionInstance ) => {
  Tyr.info(`Migrating obfuscateable fields from ${sourceCollection.name} to ${targetCollection.name} `);
  const projection = projectionForObfuscateableFields(sourceCollection);

  const options = {
    cursor: { batchSize: defaultBatchSize },
    allowDiskUse: true
  };

  const migrationSteps = [
    { $match: query  },
    { $project: projection}, // Limit to just obfuscateable fields
    { $out: targetCollection.def.dbName } // Will overwrite what is currently in collection
  ]
  
  const emptyCursor = await sourceCollection.db.aggregate(migrationSteps, options);

  // $out does not take effect until the empty cursor is acted upon.  
  // .toArray() should not return any data
  // 'Works as designed' https://jira.mongodb.org/browse/NODE-1398
  await emptyCursor.toArray();
  Tyr.info(`Completed migration of obfuscateable fields from ${sourceCollection.name} to ${targetCollection.name}`);
}

// Probably not as efficient as mapreduce
// TODO: recovery of mid encryption failure
// TODO: trace logging
Tyr.encryptCollection = async (collection: Tyr.CollectionInstance, masterKey: string) => {
  await encryptDecryptData(collection, masterKey, {}, false);
}

const encryptDecryptData = async (collection: Tyr.CollectionInstance, masterKey: string, query: Tyr.MongoQuery, decrypt?: boolean) => {

  const aesUtil = new AesUtil(masterKey);
  const cursor = await collection.db.find(query);
  let bulkOp = collection.db.initializeUnorderedBulkOp();

  const count = await cursor.count();
  let doc;
  for (let i = 1; i <= count; i++) {
    doc = await cursor.next();

    bulkOp.find({ _id: doc._id }).update({ $set: encryptDocument(doc, aesUtil, decrypt) });

    if ((i % defaultBatchSize === 0) || i === count) {
      Tyr.info('Flushing encrypted batch');
      const result: BulkWriteResult = await bulkOp.execute();

      if (!result.ok) {
        throw new Error(`Encryption of collection failed`)
      }
      bulkOp = collection.db.initializeUnorderedBulkOp();
    }
  }
}
// TODO: Need to think of wording
const encryptDocument = (doc: any, aesUtil: AesUtil, decrypt?: boolean): object => {
  //TODO: figure out better approach to typing obj
  let encObj: any = {};

  Object.getOwnPropertyNames(doc).forEach(key => {
    if (key !== "_id") {
      //Encryption util is simplistic right now
      //should replace with established library
      const val = doc[key];
      //simple attempt at supporting datatypes other than string
      encObj[key] = decrypt ? aesUtil.decrypt(doc[key]) : aesUtil.encryptString((typeof val === 'string') ? val : JSON.stringify(val));
    }
  });

  return encObj;
}

Tyr.restoreObfuscatedData = async (targetCollection: Tyr.CollectionInstance, sourceCollection: Tyr.CollectionInstance, query ?: Tyr.MongoQuery, decryptionKey ?: string) => {
  //decrypt collection
  if (decryptionKey) {
    // need better method naming
    await encryptDecryptData(sourceCollection, decryptionKey, query, true);
  }
  //migrate data back to targetCollection
  await migrateData(targetCollection, sourceCollection, query);

}

const migrateData = async (targetCollection: Tyr.CollectionInstance, sourceCollection: Tyr.CollectionInstance, query?: Tyr.MongoQuery) => {
  const q = query ? query : {};
  const cursor = await sourceCollection.db.find(q);
  let bulkOp = targetCollection.db.initializeUnorderedBulkOp();

  const count = await cursor.count();
  let doc;
  for (let i = 1; i <= count; i++) {
    doc = await cursor.next();

    bulkOp.find({ _id: doc._id }).update({ $set: doc });

    if ((i % defaultBatchSize === 0) || i === count) {
      Tyr.info('Flushing encrypted batch');
      const result: BulkWriteResult = await bulkOp.execute();

      if (!result.ok) {
        throw new Error(`Failed migration of collection ${sourceCollection.name} to ${targetCollection.name} \n ${JSON.stringify(result.getWriteErrors())}`);
      }
      bulkOp = targetCollection.db.initializeUnorderedBulkOp();
    }
  }
}

// MapReduce attempt, not sure how to specify dynamic fields.
// Tyr.encryptCollection = async (collection: Tyr.CollectionInstance, masterKey: string) => {
//   const mapFunction = () => {
//     let key = this._id;
//     let vals = {};

//     Object.getOwnPropertyNames(collection.def.fields).forEach(key => {
//        vals[key] =
//       //use key and value here
//     });

//     emit(key, vals );
//   };
//   const reduceFunction = () => {

//   }
//   collection.db.mapReduce(mapFunction, reduceFunction);
// }

const projectionForObfuscateableFields = (collection: Tyr.CollectionInstance): object => {
  const obfsctFields = obfuscateableFieldsFromCollection(collection);
  let projection: any = {};

  obfsctFields.forEach((f: string) => {
    projection[f] = 1;
  })
  return projection;
}

const obfuscateableFieldsFromCollection = (collection: Tyr.CollectionInstance): Array<string> => {
  const names: Array<string> = [];
  for (const fieldName in collection.def.fields) {
    if (collection.def.fields[fieldName].def.obfuscateable) {
      names.push(fieldName);
    }
  }
  return names;
}

const getMetaDataCollection = async (name: string): Promise<Collection> => {
  const existingCollection = await Tyr.db.collection(name);
  if (!existingCollection) {
    return createMetaDataCollection(name);
  }
  return existingCollection;
}

//TODO: probably remove, up to consumer to provide collection
const createMetaDataCollection = async (name: string): Promise<Collection> => {
  return await Tyr.db.createCollection<Tyr.ObfuscateMetaDataSchema>(name, { autoIndexId: true });
}

const createBatchMetaData = async (fields: Array<string>, srcCollection: Collection,
  targetCollection: Collection, query: FilterQuery<object>, replaceVals: object, replaceValCollection: Collection): Promise<Tyr.ObfuscateBatchResult> => {
  
  const timeStamp: number = new Date().getTime();
  const batchTag: ObjectID = new ObjectID();
  const docIdsCursor: Cursor = await srcCollection.find(query).project(idOnlyProjection);

  const count = await docIdsCursor.count();
  Tyr.info(`Obfuscating ${count} documents from ${srcCollection.namespace} tag ${batchTag}`);

  let bulkMetaData = targetCollection.initializeUnorderedBulkOp();

  let doc: IdRecord;
  let metaDataRecord: Tyr.ObfuscateMetaDataSchema;
  let batchRecIds = [];

  for (let i = 1; i <= count; i++) {
    doc = await docIdsCursor.next();

    metaDataRecord = {
      timestamp: timeStamp, recordId: doc._id, fields, batchTag
    };
    batchRecIds.push(doc._id);
    bulkMetaData.insert(metaDataRecord);

    if ((i % defaultBatchSize === 0) || i === count) {
      try {
        const metaDataResult: BulkWriteResult = await bulkMetaData.execute();
      } catch (error) {
        console.log(`MetaData Error: ${JSON.stringify(error)}`);
      }

      if (!replaceVals) {
        //Move data from given collection to be mask
        applyMaskValuesFromCollection(batchRecIds, replaceValCollection, srcCollection);
      }

      bulkMetaData = targetCollection.initializeUnorderedBulkOp();
    }
  }

  try {
    //Static replacement values can be applied at once
    const maskResult: UpdateWriteOpResult = await srcCollection.updateMany(query, { $set: replaceVals });
  } catch (error) {
    console.log(`Masking Error: ${JSON.stringify(error)}`);
  }
  Tyr.info(`Finished obfuscating collection ${srcCollection.namespace} tag ${batchTag}`);

  // TODO: Get count from batch results
  return { batchTag: batchTag, count: count };
}

// TODO: Implement
const applyMaskValuesFromCollection = (recordIds: any[], replaceValCollection: Collection, targetCollection: Collection): Promise<BulkWriteResult> =>{
  const bulkUpdate = targetCollection.initializeUnorderedBulkOp();
  const replaceValPointer = replaceValCollection.find({_id: {}})
  // recordIds.forEach(id => {
  //   bulkUpdate.find()
  //  });
  // bulkUpdate.push

  return bulkUpdate.execute();
}


export const validate = () => { 
  //TDB: Validate obfuscate config
};