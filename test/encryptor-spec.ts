import test from 'ava';
import {AesUtil, Encryptor} from '../src/encryptor';


let encryptor: AesUtil;
const masterKey = '1234567';

test.before('setup encrypter', t => {
    encryptor = new AesUtil (masterKey); 
});

test('Should encrypt given string', t => {
    const testString = "This is my test input";

    const output = encryptor.encryptString(testString);

    t.true((testString !== output), "Verify output string is not the same");
});

// test('Should be able to decrypt encrypted string', t => {
//     t.true(false, "TODO: Implementation, fail until then");
// ;});