import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function reset() {
  await sql`UPDATE table_sessions SET status = 'closed', closed_at = now() WHERE status = 'active'`;
  await sql`UPDATE tables SET status = 'free'`;
  await sql`UPDATE orders SET seat_id = NULL WHERE seat_id IN (SELECT id FROM seats WHERE joined_at < now() - interval '1 hour')`;
  await sql`DELETE FROM seats WHERE joined_at < now() - interval '1 hour'`;
  console.log('Reset done');
}

reset().catch(console.error);
