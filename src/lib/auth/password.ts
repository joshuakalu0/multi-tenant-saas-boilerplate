import bcrypt from "bcryptjs";

export async function createPasswordHash(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPasswordHash(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
