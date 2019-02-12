import test from 'ava';
import { obfuscator } from '../src/obfuscator.plugin';
import { Tyr } from 'tyranid';
import { DBManager, User } from './util';

let dbManager: DBManager;

test.before('Setup Database', t => {
  dbManager = new DBManager();
  return dbManager.start();
});

test('Should have user entries', tst => {
  Tyr.byName.user.find({ query: {} }).then(collection => {
    tst.true(collection, 'Get something back');
  });
});

test.after('Shut down server', t => {
  return dbManager.stop();
});
