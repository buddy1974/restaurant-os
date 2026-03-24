import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Adding host system to database...');
  await sql`ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS host_seat_id UUID REFERENCES seats(id) DEFAULT NULL`;
  await sql`ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS payment_locked_by UUID REFERENCES seats(id) DEFAULT NULL`;
  await sql`ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS payment_locked_at TIMESTAMPTZ DEFAULT NULL`;
  console.log('Migration complete.');
}
migrate().catch(console.error);
