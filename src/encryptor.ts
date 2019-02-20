import * as crypto from 'crypto';

export interface Encryptor {
    encryptString(input: string): string;
    decrypt(encdata: string): string;
}
/**
 * For now defaulting to one method of encryption
 * Later add support to extend encryption modes
 * 
 * Also allow decryption auth.
 */
export class AesUtil implements Encryptor {
    private masterKey: string;
    private salt: string | Buffer;
    private digest: string;

    constructor(masterKey: string, salt?: string, digest?: string) {
        this.masterKey = masterKey;
        this.salt = salt ? salt : crypto.randomBytes(64);
        this.digest = digest ? digest : 'sha512';
    }

    public encryptString(input: string ): string {
        // random initialization vector
        const iv = crypto.randomBytes(16);

        // derive encryption key: 32 byte key length
        // in assumption the masterkey is a cryptographic and NOT a password there is no need for
        // a large number of iterations. It may can replaced by HKDF
        // the value of 2145 is randomly chosen!
        const key: Buffer = crypto.pbkdf2Sync(this.masterKey, this.salt, 2145, 32, this.digest);

        // AES 256 GCM Mode
        const cipher: crypto.Cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        // encrypt the given text
        const encryptedText = Buffer.concat([cipher.update(input, 'utf8'), cipher.final()]);

        // extract the auth tag
        // TODO: Save this with metadata, provide option to validate;
        const tag = cipher.getAuthTag();

        return encryptedText.toString('utf8');
    }

    //TODO: Generic return type based on object
    public decrypt (encdata: string ): string{
        // base64 decoding
        const bData = Buffer.from(encdata, 'base64');

        // convert data to buffers
        const salt = bData.slice(0, 64);
        const iv = bData.slice(64, 80);
        const tag = bData.slice(80, 96);
        const text = bData.slice(96);

        // derive key using; 32 byte key length
        const key = crypto.pbkdf2Sync(this.masterKey, salt, 2145, 32, 'sha512');

        // AES 256 GCM Mode
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        // encrypt the given text
        const decrypted = decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');

    return decrypted;
}
}