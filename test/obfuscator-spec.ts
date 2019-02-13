import test from 'ava';
import { obfuscator } from '../src/obfuscator.plugin';
import { Tyr } from 'tyranid';
import { DBManager, User } from './util';
import { UserPreferences } from 'typescript';

let dbManager: DBManager;

test.before('Setup Database', t => {
  dbManager = new DBManager();
  return dbManager.start();
});

test.serial('Should have user entries', async tst => {
  console.log("Starting test #1");
  const user = await User.findOne({ query: {} });
  console.log(JSON.stringify(user));
  tst.true((user !== undefined), 'Get something back');
});

test.after('Shut down server', t => {
  return dbManager.stop();
});
