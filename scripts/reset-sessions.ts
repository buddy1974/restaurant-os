import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function reset() {
  await sql`UPDATE table_sessions SET status = 'closed', closed_at = now() WHERE status = 'active'`;
  await sql`UPDATE tables SET status = 'free'`;
  await sql`UPDATE orders SET seat_id = NULL WHERE seat_id IS NOT NULL`;
  await sql`UPDATE table_sessions SET host_seat_id = NULL, payment_locked_by = NULL, payment_locked_at = NULL`;
  await sql`DELETE FROM seats`;
  console.log('Reset done');
}

reset().catch(console.error);
