import { verifyPasswordFromEnvironment } from "./operations";
import { readHiddenPassword } from "./password-input";

async function main() {
  const password = await readHiddenPassword("Password to verify: ");
  const matches = await verifyPasswordFromEnvironment(process.env, password);
  console.log(matches ? "MATCH" : "MISMATCH");
  process.exitCode = matches ? 0 : 1;
}

main().catch(() => {
  console.error("MISMATCH");
  process.exitCode = 2;
});
