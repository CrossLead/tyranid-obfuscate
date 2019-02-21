# tyranid-obfuscate

[![Build Status](https://travis-ci.org/{{github-user-name}}/{{github-app-name}}.svg?branch=master)](https://travis-ci.org/{{github-user-name}}/{{github-app-name}}.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/{{github-user-name}}/{{github-app-name}}/badge.svg?branch=master)](https://coveralls.io/github/{{github-user-name}}/{{github-app-name}}?branch=master)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

# Setup

- To set up the `TyranidObfuscator`, mark fields on a collection with `obfuscateable:true` as shown below. In addition provide a collection name that
will be used for storing the metadata for each obfuscation batch

```ts
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
  }
}) as UserCollection;
```

- Add a call to `TyrObfuscator.validate();` after calling `Tyr.validate();`, this will ensure that fields marked `obfusvcateable` are valid

```ts
Tyr.validate();
TyrObfuscator.validate();
```


# Usage

- To preserve data that will be obfuscated, utilize the `Tyr.copyObfuscateableData` function. Provide a query that selects a subset from the target collection as well as a secondary collection to migrate the data to. In the below example, the previously instantiated `User` collection will have the first ten records migrated to a new collection called `copiedPIICollection`

```ts
const copiedPIICollection = new Tyr.Collection({
  id: '_c1',
  name: 'copiedData',
  dbName: 'copiedData',
  internal: false,
  fields: {
    _id: { is: 'mongoid' },
    firstName: { is: 'string' },
    lastName: { is: 'string' },
    ip_address: { is: 'string' }
  }
});

 const query ={ { _id: { $lte: 10 }  } ;
 await Tyr.copyObfuscateableData(query, Tyr.byName.user, copiedPIICollection);
```

- The preserved data can either be exported, kept in place, or encrypted for secure cold storage.  `Tyr.encryptCollection` will use AES encryption across all records of a given collection, secured with the provided password or `masterKey`

```ts
await Tyr.encryptCollection(copiedPIICollection, masterKey);
```

- Next apply static replacement values to all of the selected records in `User`. Provide the same query to mask a subset of records in `User`.  The field name to value object specified for `replacementValues` will replace the data in the `User` collection with the specified values.  

- Each record affected will have a corresponding entry in the metadata collection that can be queried to determine fictitious values in the `User` collection. The metadata collection will be named by appending the provided `metadataSuffix` value to the given collection.  In the below example, collection `user` will have a metadata collection name of `user__metadata`;



```ts
// Again, mask the first ten records
const query = { _id: { $lte: 10 } };

const opts: Tyr.ObfuscateBatchOpts = {
    query: query,
    collection: Tyr.byName.user,
    replacementValues: {
        firstName: 'John',
        lastName: 'Doe',
        ip_address: '0.0.0.0'
    },
    metadataSuffix: '__metadata'
};

const batchResults: Tyr.ObfuscateBatchResult = await Tyr.obfuscate(opts);
```



- To restore the obfuscated data to its original state call `Tyr.restoreObfuscatedData` with the collection to restore (`User`), the collection holidng the values to be placed on the collection to restore (`copiedPIICollection`), a query to restore a subset of the records in `copiedPIICollection` and finally the masterKey used to decrypt the collection if it was encrypted.

```ts
  // Blank query to restore all records from copiedPIICollection
  const query: Tyr.MongoQuery = {};
  await Tyr.restoreObfuscatedData(Tyr.byName.user, copiedPIICollection, query, masterKey);
```

## Setting travis and coveralls badges
1. Sign in to [travis](https://travis-ci.org/) and activate the build for your project.
2. Sign in to [coveralls](https://coveralls.io/) and activate the build for your project.
3. Replace {{github-user-name}}/{{github-app-name}} with your repo details like: "ospatil/generator-node-typescript".
