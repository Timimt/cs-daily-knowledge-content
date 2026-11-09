import { closeDatabase, initializeDatabase } from "./init";
import { databaseLocation } from "./index";

initializeDatabase();
console.log(`Database initialized at ${databaseLocation}`);
closeDatabase();
