import { config } from "dotenv";
config();
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function fixNullPasswords() {
 console.log("Dropping legacy columns...");
 await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS google_id;`);
 await db.execute(sql`ALTER TABLE items DROP COLUMN IF EXISTS is_sold;`);
 console.log("Done.");
 process.exit(0);
}

fixNullPasswords().catch(console.error);
