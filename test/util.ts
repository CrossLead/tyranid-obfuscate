import * as fs from 'fs';
import { Db, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Tyr } from 'tyranid';

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
      // consoleLogLevel: false,
      dbLogLevel: "INFO" as "INFO"
    };

    await Tyr.config({});
    await Tyr.config(options);

    Tyr.validate();

    // TODO: get path dynamically
    const obj = JSON.parse(fs.readFileSync('/Users/adam/Documents/opensource/tyranid-obfuscate/test/data/users.json', 'utf8'));
    obj.forEach((o: any) => {
      User.insert(o);
    });

    return this.db;
  }

  stop() {
    this.connection.close();
    return this.server.stop();
  }

  cleanup() {}
}
