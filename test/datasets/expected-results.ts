import { Tyr } from 'tyranid';
import { Collection } from 'mongodb';

const collectionMaskValues = [{ id_: 11, firstName: 'id_1Name', lastName: 'test_lastname', ip_address: '1.1.1.1' },
    { id_: 12, firstName: 'id_1Name', lastName: 'test_lastname', ip_address: '1.1.1.2' },
    { id_: 13, firstName: 'id_1Name', lastName: 'test_lastname', ip_address: '1.1.1.3' },
    { id_: 14, firstName: 'id_1Name', lastName: 'test_lastname', ip_address: '1.1.1.1' },
    { id_: 15, firstName: 'id_1Name', lastName: 'test_lastname', ip_address: '1.1.1.4' },];

export const ExpectedResults = {
    MaskPIIWithStaticValues: '[{"_id":1,"email":"ncroasdale0@cpanel.net","firstName":"USER","lastName":"x","gender":"Male","ip_address":"0.0.0.0","createdAt":"6/30/2018"},' +
        '{"_id":2,"email":"crooper1@guardian.co.uk","firstName":"USER","lastName":"x","gender":"Male","ip_address":"0.0.0.0","createdAt":"11/10/2018"},' +
        '{"_id":3,"email":"ftorfin2@youtu.be","firstName":"USER","lastName":"x","gender":"Male","ip_address":"0.0.0.0","createdAt":"12/22/2018"},' +
        '{"_id":4,"email":"ldenidge3@quantcast.com","firstName":"USER","lastName":"x","gender":"Male","ip_address":"0.0.0.0","createdAt":"10/20/2018"},' +
        '{"_id":5,"email":"charnes4@redcross.org","firstName":"USER","lastName":"x","gender":"Male","ip_address":"0.0.0.0","createdAt":"11/21/2018"},' +
        '{"_id":6,"email":"dfishpoole5@example.com","firstName":"USER","lastName":"x","gender":"Female","ip_address":"0.0.0.0","createdAt":"10/11/2018"},' +
        '{"_id":7,"email":"gbrandolini6@aol.com","firstName":"USER","lastName":"x","gender":"Female","ip_address":"0.0.0.0","createdAt":"12/8/2018"},' +
        '{"_id":8,"email":"snapthine7@fotki.com","firstName":"USER","lastName":"x","gender":"Male","ip_address":"0.0.0.0","createdAt":"11/10/2018"},' +
        '{"_id":9,"email":"lrijkeseis8@deviantart.com","firstName":"USER","lastName":"x","gender":"Female","ip_address":"0.0.0.0","createdAt":"1/3/2019"},' +
        '{"_id":10,"email":"lyashnov9@howstuffworks.com","firstName":"USER","lastName":"x","gender":"Female","ip_address":"0.0.0.0","createdAt":"11/19/2018"}]',
    
    MaskPIIWithCollectionValues: (JSON.stringify(collectionMaskValues)),

    CopiedObfuscateableData: '[{"_id":1,"firstName":"Nye","lastName":"Croasdale","ip_address":"173.155.66.90"},' +
        '{"_id":2,"firstName":"Coleman","lastName":"Rooper","ip_address":"203.52.25.41"},' +
        '{"_id":3,"firstName":"Friedrich","lastName":"Torfin","ip_address":"59.28.45.28"},' +
        '{"_id":4,"firstName":"Luigi","lastName":"Denidge","ip_address":"127.47.116.41"},' +
        '{"_id":5,"firstName":"Claiborn","lastName":"Harnes","ip_address":"219.146.160.42"},' +
        '{"_id":6,"firstName":"Doretta","lastName":"Fishpoole","ip_address":"196.50.150.64"},' +
        '{"_id":7,"firstName":"Glennie","lastName":"Brandolini","ip_address":"91.218.223.160"},' +
        '{"_id":8,"firstName":"Stearne","lastName":"Napthine","ip_address":"138.19.53.74"},' +
        '{"_id":9,"firstName":"Laureen","lastName":"Rijkeseis","ip_address":"201.53.250.84"},' +
        '{"_id":10,"firstName":"Lulita","lastName":"Yashnov","ip_address":"114.100.49.94"}]',
    
    OriginalFirstTenRecords: '[{"_id":1,"email":"ncroasdale0@cpanel.net","firstName":"Nye","lastName":"Croasdale","gender":"Male","ip_address":"173.155.66.90","createdAt":"6/30/2018"},' +
        '{"_id":2,"email":"crooper1@guardian.co.uk","firstName":"Coleman","lastName":"Rooper","gender":"Male","ip_address":"203.52.25.41","createdAt":"11/10/2018"},' +
        '{"_id":3,"email":"ftorfin2@youtu.be","firstName":"Friedrich","lastName":"Torfin","gender":"Male","ip_address":"59.28.45.28","createdAt":"12/22/2018"},' +
        '{"_id":4,"email":"ldenidge3@quantcast.com","firstName":"Luigi","lastName":"Denidge","gender":"Male","ip_address":"127.47.116.41","createdAt":"10/20/2018"},' +
        '{"_id":5,"email":"charnes4@redcross.org","firstName":"Claiborn","lastName":"Harnes","gender":"Male","ip_address":"219.146.160.42","createdAt":"11/21/2018"},' +
        '{"_id":6,"email":"dfishpoole5@example.com","firstName":"Doretta","lastName":"Fishpoole","gender":"Female","ip_address":"196.50.150.64","createdAt":"10/11/2018"},' +
        '{"_id":7,"email":"gbrandolini6@aol.com","firstName":"Glennie","lastName":"Brandolini","gender":"Female","ip_address":"91.218.223.160","createdAt":"12/8/2018"},' +
        '{"_id":8,"email":"snapthine7@fotki.com","firstName":"Stearne","lastName":"Napthine","gender":"Male","ip_address":"138.19.53.74","createdAt":"11/10/2018"},' +
        '{"_id":9,"email":"lrijkeseis8@deviantart.com","firstName":"Laureen","lastName":"Rijkeseis","gender":"Female","ip_address":"201.53.250.84","createdAt":"1/3/2019"},' +
        '{"_id":10,"email":"lyashnov9@howstuffworks.com","firstName":"Lulita","lastName":"Yashnov","gender":"Female","ip_address":"114.100.49.94","createdAt":"11/19/2018"}]'
}

export const createMaskingValuesCollection = async (): Promise<Collection> => {
    const collection = await Tyr.db.createCollection('testMask');
    await collection.insertMany(collectionMaskValues);
    return collection;
}