import { Tyr, ObjectID } from 'tyranid';
import { ObjectId, Collection } from 'mongodb';

/**
 * Extend the Tyranid FieldInstance definition to include:
 * flag for which fields to obfuscate, and function on
 * collection to call obfuscation
 */

declare module 'tyranid' {
    namespace Tyr {
        /**
         * Relocates the data to given location
         * 
         * Returns cursor to affected documents
         * 
         * @param opts ObfuscateBatchConfig
         * @returns ObfuscateBatchResult
         */
        export function obfuscate(opts: ObfuscateBatchOpts): Promise<ObfuscateBatchResult>;
        
        /**
         * TODO: $out fn used can only replace data in collection previous
         *  to v4.2, multiple runs will right now replace entire dataset
         *  Workaround: create multiple collections for each obfuscation batch run
         * 
         * Copy data from fields marked as 'obfuscateable' from 
         * source collection to target collection
         * The source _id field will also be copied to the target
         * 
         * @param query selector for which records to 
         * @param sourceCollection 
         * @param targetCollection existing collection in which to hold the results
         */
        export function copyObfuscateableData(query: MongoQuery, sourceCollection: Tyr.CollectionInstance, targetCollection: Tyr.CollectionInstance);

        /**
         * TODO: Uses very simplistic encryption, find library
         * TODO: If updated to use Auth Tags, how to persist?
         * 
         * Encrypts the field values of the provided collection utilizing AES
         * Does not encrypt the _id field
         * 
         * @param targetCollection Collection to encrypt
         * @param masterKey string key to use for encryption, must be preserved for decryption
         * 
         */
        export function encryptCollection(targetCollection: Tyr.CollectionInstance, encryptionKey: string);

        /**
         * TODO: Still need to figure out how to tie metadata collection to target
         *              For now just explicitly pass in collections
         * TODO: When restoring, what do we want to do with metadata? 
         * 
         * Restores data that was masked to its original state
         * 
         * @param targetCollection Collection to have data inserted into
         * @param sourceCollection Collection that data will be pulled from
         * @param query optionally specify subset of data to restore, if no query specified all records will be replaced
         * @param decryptionKey Decryption key for the supplied data if it is encrypted.
         */
        export function restoreObfuscatedData(targetCollection: Tyr.CollectionInstance, sourceCollection: Tyr.CollectionInstance, query?: Tyr.MongoQuery, decryptionKey?: string)
        export interface ObfuscateBatchConfig {
            metadataCollectionName: string

        }
        export interface ObfuscateBatchResult {
            /**
             * Unique identifier for the obfuscate batch.
             * Set on each metadata record instance to later identify
             * affected records.
             */
            batchTag: ObjectId, //Might use UUID?

            /**
             * Number of records affected
             */
            count: number,

        }
        export interface ObfuscateBatchOpts {
            /**
             * MongoDB query for selecting which records to obfuscate
             */
            query: FilterQuery,

            /**
             * Target Tyranid collection
             */
            collection: ObfuscateableCollectionInstance,

            /**
             * Optionally specify a collecton that contains records with the associated masked records _id field
             * Fields on the record not specified here will not be altered.
             * 
             * [{
             *      _id: {id of record to alter},
             *      field: value
             * },{
             *      _id: 2,
             *      name: 'John Doe'
             * }]
             * 
             */
            replacementValCollection?: Collection,

            /**
             * Optionally define replacement values for each field of every record
             * Obfuscated.
             * {
             *  field: value
             * }
             */
            replacementValues?: object,
            
        }

        export interface ObfuscateCollectionConfig {
            metadataCollectionName: string;
        }
        interface CollectionDefinitionHydrated {
            obfuscateConfig: string;
        }

        /**
         * This won't work
         */
        export interface ObfuscateableCollectionInstance extends CollectionInstance<IdType, T> {
            obfuscateConfig: ObfuscateCollectionConfig;
        }

        /**
         * Will probably need an overall batch table that relates to the data run for that batch
         */
        export interface ObfuscateMetaDataSchema {
            //Unix Epoch Time
            timestamp: number;
            _id?: ObjectID; 
            /**
             * ID of the record being obfuscated
             */
            recordId: ObjectID; 
            fields: Array<string>; //Names of fields that were obfuscated

            /**
             * Optionally store
             */
            encryptedData?: object;
            /**
             * Uniquie Identifier for individual batch run
             */
            batchTag: ObjectId;
        }


        export interface ObfuscateMetaDataCollection extends Tyr.CollectionInstance<ObjectID, ObfuscateMetaDataSchema> {
        };

        interface FieldInstance {
            obfuscateable: string;
        }
    }
}