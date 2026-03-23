import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Adding session_type to table_sessions...');

  await sql`
    ALTER TABLE table_sessions
    ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'individual'
  `;

  await sql`
    ALTER TABLE seats
    ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT NULL
  `;

  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
