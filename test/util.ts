import { Db, MongoClient, ObjectID } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Tyr } from 'tyranid';
import * as TyrObfuscator from '../src';
import TestDataSet from './datasets/users';


TyrObfuscator.validate();

export interface User extends Tyr.Document<ObjectID> {
  firstName: string;
  lastName: string;
  gender: string;
  ip_address: string;
  createdAt: Date;
  _id: ObjectID;
}

/**
 * Type 'User' does not satisfy the constraint 'AnyIdType'.
 * Type 'User' is missing the following properties from type 
 * 'ObjectID': generationTime, equals, generate, getTimestamp, toHexString
 */
export interface UserCollection extends Tyr.ObfuscateableCollectionInstance {
};


export const User = new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'dbTest',
  fields: {
    _id: { is: 'mongoid' },
    email: { is: 'email' },
    firstName: { is: 'string', obfuscateable: true, required: true }, 
    lastName: { is: 'string', obfuscateable: true },
    gender: { is: 'string' },
    ip_address: { is: 'string', obfuscateable:true,  required: true},
    createdAt: { is: 'date' }
  },
  obfuscateConfig:{
    metadataCollectionName: 'userObfuscateMetaData'
  }
}) as UserCollection;

export class DBManager {
  private connection: MongoClient;
  private db: Db;
  private server: MongoMemoryServer;

  constructor() {
    
    this.db = null;
    this.server = new MongoMemoryServer();
    this.connection = null;
  }

  public async start() {
    console.log('STARTING DATABASE');
    const url = await this.server.getConnectionString();
    this.connection = await MongoClient.connect(url, { useNewUrlParser: true });
    const serverName = await this.server.getDbName();
    this.db = this.connection.db(serverName);
    
    const options : Tyr.ConfigOptions = {
      db: this.db,
      mongoClient: this.connection,
      dbLogLevel: "INFO"
    };

    await Tyr.config(options);
 
    // Still need this explicit even when validate set on config 
    await Tyr.validate();


    await User.insert(TestDataSet);
    console.log(`Database Up, Collections ${Tyr.collections}`);
    return this.db;
  }

  public isRunning() {
    return this.connection.isConnected();
  }

  /**
   * In-memory server, data is not persisted after the service
   * is stopped.
   */
  public async stop() {
    console.log("Server Stop");
    this.connection.close();
    return this.server.stop();
  }
}
