/**
 * Шифрование серверного токена трекера организации (BYTEA в organization_secrets).
 * AES-256-GCM; версия ключа хранится в БД отдельно (encryption_key_version).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function assertKeyLength(key: Buffer): void {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Organization secrets key must be ${KEY_LENGTH} bytes (AES-256)`);
  }
}

/**
 * Шифрует UTF-8 строку токена. Формат: iv(12) | tag(16) | ciphertext.
 */
export function encryptOrgTrackerToken(plaintext: string, masterKey: Buffer): Buffer {
  assertKeyLength(masterKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, masterKey, iv, { authTagLength: TAG_LENGTH });
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

/**
 * Расшифровывает буфер из {@link encryptOrgTrackerToken}.
 */
export function decryptOrgTrackerToken(ciphertext: Buffer, masterKey: Buffer): string {
  assertKeyLength(masterKey);
  if (ciphertext.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid ciphertext: too short');
  }
  const iv = ciphertext.subarray(0, IV_LENGTH);
  const tag = ciphertext.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = ciphertext.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, masterKey, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
