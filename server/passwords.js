import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Buffer } from 'buffer';

const DERIVED_KEY_LENGTH = 64;

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string.');
  }
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, DERIVED_KEY_LENGTH);
  return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password, encodedHash) {
  if (typeof encodedHash !== 'string') {
    return false;
  }

  const [algorithm, saltHex, hashHex] = encodedHash.split(':');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) {
    return false;
  }

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, salt, expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
