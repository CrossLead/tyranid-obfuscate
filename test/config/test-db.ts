import { spawn } from "child_process";
import * as fs from "fs";
import * as mongodb from "mongodb";
import * as path from "path";
import { Tyr } from "tyranid";
import tyrConfig from "./tyranid";

const rootDir = path.join(__dirname, "../../../");

// Helper class
export default class TestDatabase {
  public static db: mongodb.Db | null = null;

  // TODO: config = typeof getConfig return value
  // tslint:disable-next-line no-any  TODO: fix existing any
  public static async setup(config: any, dbSuffix: string, indexes = true) {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("Node environment must be set to test!");
    }

    if (TestDatabase.db) {
      return TestDatabase.db;
    }

    const mongoClient = await mongodb.MongoClient.connect(
      config.db.mongoUrl + (dbSuffix || ""),
      { useNewUrlParser: true }
    );
    const db = mongoClient.db();

    await db.dropDatabase();

    // Initialize Tyranid with a promised-mongo instance.
    Tyr.config({});
    const tConfig = {
      mongoClient,
      db,
      validate: [{ glob: `${rootDir}app/server/**/*.model.js` }],
      indexes: indexes,
      logLevel: "ERROR",
      permissions: {
        find: "read",
        insert: "create",
        update: "update",
        remove: "delete"
      }
    } as Tyr.ConfigOptions;
    await tyrConfig(Tyr, tConfig);

    await Promise.all(Tyr.collections.map(col => col.remove({ query: {} })));

    TestDatabase.db = db;
    return db;
  }

  /**
   * More or less like the mongoimport CLI util but also accepts
   * a directory of JSON import files for the --file param
   */
  public static async mongoimport({
    collection,
    db = "c3test",
    host = "",
    port = 0,
    file,
    jsonArray = true
  }: {
    collection?: string;
    db: string;
    host?: string;
    port?: number;
    file: string;
    jsonArray?: boolean;
  }): Promise<void> {
    if (!file) {
      throw new Error("Missing required param `file`");
    }

    const stats = fs.lstatSync(file);
    if (stats.isDirectory()) {
      const filenames = fs.readdirSync(file);
      await Promise.all(
        filenames.map(filename => {
          return TestDatabase.mongoimport({
            collection,
            db,
            file: path.join(file, filename),
            host,
            jsonArray,
            port
          });
        })
      );

      return;
    }

    const args = ["--file", file, "--db", db, "--quiet"];

    if (collection) {
      args.push(...["--collection", collection]);
    }

    if (host) {
      args.push(...["--host", host]);
    }

    if (port) {
      args.push(...["--port", port.toString()]);
    }

    if (jsonArray) {
      args.push("--jsonArray");
    }

    const child = spawn(`${process.env.MONGODIR || ""}mongoimport`, args, {
      cwd: rootDir
    });

    return new Promise<void>((resolve, reject) => {
      child.on("error", err => {
        // logger.error('child.on(error)');
        // logger.error(err);
        reject(err);
      });

      child.stderr.on("data", (/*data*/) => {
        // Don't necessarily fail since some mongoimport
        // warnings show up on stderr
        // Too much chatter, leave out for now
        // logger.error('' + data);
      });

      child.on("exit", (/*code, signal*/) => resolve());
    });
  }
}
