import { parsePasswordHash, verifyPassword } from "../password";

export async function verifyPasswordFromEnvironment(
  env: NodeJS.ProcessEnv,
  password: string,
): Promise<boolean> {
  const passwordHash = env.AUTH_PASSWORD_HASH?.trim() ?? "";
  if (!passwordHash) {
    throw new Error("AUTH_PASSWORD_HASH_MISSING");
  }
  try {
    parsePasswordHash(passwordHash);
  } catch {
    throw new Error("AUTH_PASSWORD_HASH_INVALID");
  }
  return verifyPassword(password, passwordHash);
}
