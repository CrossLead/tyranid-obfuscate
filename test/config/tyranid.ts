import { getConfig } from "./config";
import { MongoClient } from "mongodb";
import * as path from "path";
import { Tyr as TyrModule } from "tyranid";

type Tyranid = typeof TyrModule;

/**
 *  Extended Tyranid confg (e.g. plugins)
 */
export default async function(Tyr: Tyranid, config?: TyrModule.ConfigOptions) {
  let options: TyrModule.ConfigOptions;

  if (config) {
    options = config;
  } else {
    const mongoClient = await MongoClient.connect(getConfig().db.mongoUrl, {
      poolSize: 20,
      useNewUrlParser: true
    });

    const db = mongoClient.db();

    const serverModels = path.join(getConfig().root, "./*.model.js");

    options = {
      mongoClient,
      db,
      validate: [{ glob: serverModels }],
      indexes: true,
      minify: true,
      consoleLogLevel: false,
      dbLogLevel: false,
      externalLogger(obj) {},
      // we now can build the client bundle beforehand + include in webpack
      pregenerateClient: true
    };
  }

  // Initialize Tyranid with a promised-mongo instance.
  await Tyr.config(options);
}
