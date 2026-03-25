import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS kitchen_status TEXT NOT NULL DEFAULT 'new'`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchen_status TEXT NOT NULL DEFAULT 'new'`;
  console.log('kitchen_status columns added');
  process.exit(0);
}
main();
