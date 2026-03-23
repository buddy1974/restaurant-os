import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Running migration...');
  const schema = readFileSync(join(process.cwd(), 'scripts/schema.sql'), 'utf8');

  const statements = schema
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log(`Migration complete. Ran ${statements.length} statements.`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
