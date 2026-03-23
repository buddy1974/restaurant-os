import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function clear() {
  console.log('Clearing old seats and sessions...');

  await sql`DELETE FROM order_items WHERE order_id IN (
    SELECT id FROM orders WHERE seat_id IN (
      SELECT id FROM seats WHERE seat_code IN (
        'LION','EAGLE','TIGER','HAWK','WOLF','BEAR','FOX','OWL',
        'DEER','BULL','SWAN','CROW','LYNX','BOAR','CRANE','VIPER',
        'BISON','MOOSE','RAVEN','GECKO'
      )
    )
  )`;

  await sql`DELETE FROM orders WHERE seat_id IN (
    SELECT id FROM seats WHERE seat_code IN (
      'LION','EAGLE','TIGER','HAWK','WOLF','BEAR','FOX','OWL',
      'DEER','BULL','SWAN','CROW','LYNX','BOAR','CRANE','VIPER',
      'BISON','MOOSE','RAVEN','GECKO'
    )
  )`;

  await sql`DELETE FROM seats WHERE seat_code IN (
    'LION','EAGLE','TIGER','HAWK','WOLF','BEAR','FOX','OWL',
    'DEER','BULL','SWAN','CROW','LYNX','BOAR','CRANE','VIPER',
    'BISON','MOOSE','RAVEN','GECKO'
  )`;

  await sql`UPDATE tables SET status = 'free'`;
  await sql`UPDATE table_sessions SET status = 'closed', closed_at = now() WHERE status = 'active'`;

  console.log('Done. All old animal seats cleared. All tables reset to free.');
}

clear().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
