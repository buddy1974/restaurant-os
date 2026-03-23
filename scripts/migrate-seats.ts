import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Running seats migration...');

  await sql`
    CREATE TABLE IF NOT EXISTS seat_codes (
      code TEXT PRIMARY KEY
    )
  `;

  await sql`
    INSERT INTO seat_codes (code) VALUES
      ('LION'), ('EAGLE'), ('TIGER'), ('HAWK'),
      ('WOLF'), ('BEAR'), ('FOX'), ('OWL'),
      ('DEER'), ('BULL'), ('SWAN'), ('CROW'),
      ('LYNX'), ('BOAR'), ('CRANE'), ('VIPER'),
      ('BISON'), ('MOOSE'), ('RAVEN'), ('GECKO')
    ON CONFLICT DO NOTHING
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS seats (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id  UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
      seat_code   TEXT NOT NULL,
      joined_at   TIMESTAMPTZ DEFAULT now(),
      paid        BOOLEAN DEFAULT false,
      payment_mode TEXT DEFAULT NULL,
      UNIQUE(session_id, seat_code)
    )
  `;

  await sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS seat_id UUID REFERENCES seats(id)
  `;

  console.log('Seats migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
