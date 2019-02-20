/// <reference path="./typings/tyranid-extensions.d.ts" />

import { Tyr } from "tyranid";
import { Cursor, Collection, FilterQuery, BulkWriteResult, UpdateWriteOpResult, UnorderedBulkOperation } from "mongodb";
import { Timestamp, ObjectId, ObjectID } from 'bson';
import { spawn } from 'child_process';

const defaultBatchSize = 500;
const idOnlyProjection = { _id: 1 };
interface IdRecord {
  _id: ObjectID
}

/**
 * TODO: Really large Document support with GridFS API
 */
Tyr.obfuscate = async (opts: Tyr.ObfuscateBatchOpts): Promise<Tyr.ObfuscateBatchResult> => {

  const { collection, query, replacementValues, replacementValCollection } = opts;

  const sourceCollectionName: string = collection.def.dbName;
  const mongoSrcCollection: Collection = Tyr.db.collection(sourceCollectionName);

  // Complicated extending Tyr.Collection to have configurable name
  // Going with convention for now
  const metaCollecName = metaDataNameForCollection(sourceCollectionName);
  const metaDataCollection: Collection = await getMetaDataCollection(metaCollecName);
  
  const obfsctFields = obfuscateableFieldsFromCollection(collection);


  return await createBatchMetaData(obfsctFields, mongoSrcCollection, metaDataCollection, query, replacementValues, replacementValCollection);

};

//TBD: Maybe part out to an internal Tyr collection to collection migration fn
//TBD: Error handling
Tyr.copyObfuscateableData = async (query: Tyr.MongoQuery, sourceCollection: Tyr.ObfuscateableCollectionInstance, targetCollection: Tyr.CollectionInstance ) => {
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

const projectionForObfuscateableFields = (collection: Tyr.ObfuscateableCollectionInstance): object => {
  const obfsctFields = obfuscateableFieldsFromCollection(collection);
  let projection: any = {};

  obfsctFields.forEach((f: string) => {
    projection[f] = 1;
  })
  return projection;
}

const obfuscateableFieldsFromCollection = (collection: Tyr.ObfuscateableCollectionInstance): Array<string> => {
  const names: Array<string> = [];
  for (const fieldName in collection.def.fields) {
    if (collection.def.fields[fieldName].def.obfuscateable) {
      names.push(fieldName);
    }
  }
  return names;
}
const metaDataNameForCollection = (tyrCollectDbName: string):string => {
  return `${tyrCollectDbName}__meta`
}
const getMetaDataCollection = async (name: string): Promise<Collection> => {
  const existingCollection = await Tyr.db.collection(name);

  if (!existingCollection) {
    return createMetaDataCollection(name);
  }
  return existingCollection;
}

// Might be best to make metadata outside of Tyranid
const createMetaDataCollection = async (name: string): Promise<Collection> => {
  return await Tyr.db.createCollection<Tyr.ObfuscateMetaDataSchema>(name, { autoIndexId: true });
}

interface FieldObject {
  [name: string]: string;
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
  // console.log(`PROTOTYPE: ${JSON.stringify(Tyr.documentPrototype)}`);
// Tyr.documentPrototype.PROTOTYPE = 'test';
};