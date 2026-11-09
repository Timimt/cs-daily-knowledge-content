import { hashPassword } from "../password";
import {
  passwordsMatch,
  readHiddenPassword,
} from "./password-input";

async function main() {
  const first = await readHiddenPassword(
    "New password (12-1024 characters): ",
  );
  const second = await readHiddenPassword("Confirm new password: ");
  if (!passwordsMatch(first, second)) {
    console.error("Passwords do not match. No hash was created.");
    process.exitCode = 1;
    return;
  }
  if (first.length < 12 || first.length > 1024) {
    console.error("Password must contain between 12 and 1024 characters.");
    process.exitCode = 1;
    return;
  }
  const hash = await hashPassword(first);
  console.log(`AUTH_PASSWORD_HASH=${hash}`);
  console.log("Store this line only in .env or a server environment variable.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Could not create hash.");
  process.exitCode = 1;
});
