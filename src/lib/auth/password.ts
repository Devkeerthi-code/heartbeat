import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered. */
export const DUMMY_HASH = "$2b$12$1J2Gmvz5uY7CXwEtDoe44uUPNM1TM6doY1.zQx9QBKT.FAn1cKlDa";
