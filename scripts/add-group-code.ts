import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Adding group_code to table_sessions...');
  await sql`ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS group_code TEXT UNIQUE DEFAULT NULL`;
  await sql`ALTER TABLE seats ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false`;
  console.log('Done.');
}
migrate().catch(console.error);
