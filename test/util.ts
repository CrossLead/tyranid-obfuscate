import * as fs from 'fs';
import { Db, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Tyr } from 'tyranid';
import data from './config/users';

export const User = new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'users',
  fields: {
    _id: { is: 'mongoid' },
    email: { is: 'email' },
    firstName: { is: 'string', required: true },
    lastName: { is: 'string' },
    gender: { is: 'string' },
    ip_address: { is: 'string' },
    createdAt: { is: 'date' }
  }
});

const COLLECTIONS = [User];

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
    console.log('STARTING');
    const url = await this.server.getConnectionString();
    this.connection = await MongoClient.connect(url, { useNewUrlParser: true });
    this.db = this.connection.db(await this.server.getDbName());

    const options = {
      db: this.db,
      mongoClient: this.connection,
      validate: [{ glob: `${__dirname}/config/model/*` }],
      dbLogLevel: "INFO" as "INFO"
    };

    await Tyr.config(options);

    await Tyr.validate();

    await User.insert(data);
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
