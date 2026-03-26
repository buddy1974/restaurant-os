import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  await sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_email TEXT`;
  await sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_phone TEXT`;
  await sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address TEXT`;
  console.log('restaurant fields added');
  process.exit(0);
}
main();
