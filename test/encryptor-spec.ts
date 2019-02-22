import test from 'ava';
import {AesUtil, Encryptor} from '../src/encryptor';
let encryptor: AesUtil;
const masterKey = '1234567';
const testString = "This is my test input";
let encryptedString: string;

test.before('setup encrypter', t => {
    encryptor = new AesUtil(masterKey);
    encryptedString = encryptor.encryptString(testString);
});

test('Should encrypt given string', t => {
    t.true((encryptedString !== testString), "Verify output string is not the same");
});

test('Should be able to decrypt encrypted string', t => {
    const newAesUtil = new AesUtil(masterKey);
    t.true((testString !== encryptedString), "Verify output string is not the same");
    const decrypted = newAesUtil.decrypt(encryptedString)
    t.deepEqual(decrypted, testString, 'Decryption did not work');
;});