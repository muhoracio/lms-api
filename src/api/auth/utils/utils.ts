import {
  createHash,
  randomBytes,
  scrypt,
  type BinaryLike,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

export const randomBytesAsync = promisify(randomBytes);

export function sha256(msg: string): Buffer {
  return createHash("sha256").update(msg).digest();
}

export const scryptAsync: (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options?: ScryptOptions,
) => Promise<Buffer> = promisify(scrypt);
