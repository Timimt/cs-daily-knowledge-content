import crypto from "node:crypto";

console.log(`AUTH_SESSION_SECRET=${crypto.randomBytes(48).toString("base64url")}`);
console.log("Store this value only in .env or a server environment variable.");
